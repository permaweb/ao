import { randomBytes } from 'crypto'
import { TASKS_TABLE } from './sqlite.js'

/**
 * Create our task queue.
 * Check if using a "persisted" queue Id
 * by querying the database for tasks with that queue Id.
 * If there are results, set them as initial array.
 * Otherwise, start with an empty array.
 *
 */
export async function createTaskQueue ({ queueId, logger, db }) {
  logger(`Initializing queue for queue index ${queueId}`)
  function createQuery () {
    return {
      sql: `
        SELECT * FROM ${TASKS_TABLE}
        WHERE queueId = ?
        ORDER BY timestamp DESC
      `,
      parameters: [
        queueId
      ]
    }
  }

  const queryResults = (await db.query(createQuery())).map((row) => ({ ...JSON.parse(row.data), dbId: row.id }))
  const taskQueue = queryResults || []
  return taskQueue
}

/**
 * Enqueue a task onto our task queue.
 * Write it to the database after
 * adding it to the queue. Tasks are identified
 * by a dbId, which includes the queueId, timestamp,
 * and a random hex string. This is so that it can
 * be removed from the database when dequeuing.
 */
export function enqueueWith ({ queue, queueId, db }) {
  function createQuery (task, dbId, timestamp) {
    return {
      sql: `
        INSERT OR IGNORE INTO ${TASKS_TABLE}
        (id, queueId, timestamp, data)
        VALUES (?, ?, ?, ?)
      `,
      parameters: [
        dbId,
        queueId,
        timestamp,
        JSON.stringify(task)
      ]
    }
  }
  return (task) => {
    const timestamp = new Date().getTime()
    const randomByteString = randomBytes(8).toString('hex')
    const dbId = `${queueId}-${timestamp}-${randomByteString}`
    queue.push({ ...task, dbId })
    db.run(createQuery(task, dbId, timestamp))
  }
}

/**
 * Dequeue a task from the task queue.
 * Also add the ID to our dequeuedTask
 * set for later removal from the db.
 */
export function dequeueWith ({ queue, dequeuedTasks }) {
  return () => {
    if (queue.length === 0) {
      return null
    }
    const dequeuedTask = queue.shift()

    dequeuedTasks.add(dequeuedTask.dbId)
    return dequeuedTask
  }
}

/**
 * Remove dequeued tasks from the db.
 * Remove all DB records with ids that are present
 * in our dequeuedTasks set. Upon calling the function,
 * create a copy of the set using Array.from().
 * This deals with overwrite issues - only the tasks in the set
 * at the time of copying will be removed from the db and set.
 */
export function removeDequeuedTasksWith ({ dequeuedTasks, queueId, db }) {
  function createQuery (dequeuedTasks) {
    return {
      sql: `
        DELETE FROM ${TASKS_TABLE}
        WHERE id IN (${Array.from(dequeuedTasks).map(() => '?').join(',')})
      `,
      parameters: Array.from(dequeuedTasks)
    }
  }
  return () => {
    const taskCopy = Array.from(dequeuedTasks)
    if (!taskCopy.length) return

    const query = createQuery(taskCopy)

    db.run(query)
    taskCopy.forEach((task) => {
      dequeuedTasks.delete(task)
    })
  }
}
