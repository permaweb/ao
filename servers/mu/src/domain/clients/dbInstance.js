import pgPromise from 'pg-promise'

let db
export function createDbClient ({ MU_DATABASE_URL }) {
  if (db) return db

  const pgp = pgPromise()
  db = pgp(MU_DATABASE_URL)
  return db
}

const maxRetries = 5
const retryDelay = 500

/**
 * Tyler: TODO: ideally, these should each be injected the db client,
 * but trying to change the least amount for the sake of these changes
 *
 * Once these are updated to be injected db, then everything is testable
 */

async function withRetry (operation, args, retryCount = 0) {
  try {
    return await operation(...args)
  } catch (error) {
    if (error.message.includes('Connection terminated unexpectedly') && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount)
      console.log(`Database connection was lost, retrying in ${delay} ms...`)
      await new Promise(resolve => setTimeout(resolve, delay))
      return withRetry(operation, args, retryCount + 1)
    } else {
      throw error
    }
  }
}

export async function putMsg (doc) {
  await withRetry(db.none, [
    'INSERT INTO "messages" ("_id", "fromTxId", "toTxId", "msg", "cachedAt", "processId") VALUES ($1, $2, $3, $4, $5, $6)',
    [doc._id, doc.fromTxId, doc.toTxId, JSON.stringify(doc.msg), doc.cachedAt, doc.processId]
  ])
  return doc
}

export async function getMsg (id) {
  return await withRetry(db.oneOrNone, ['SELECT * FROM "messages" WHERE "_id" = $1', [id]])
}

export async function findMsgs (fromTxId) {
  return await withRetry(db.any, ['SELECT * FROM "messages" WHERE "fromTxId" = $1', [fromTxId]])
}

export async function deleteMsg (id) {
  await withRetry(db.none, ['DELETE FROM "messages" WHERE "_id" = $1', [id]])
  return id
}

export async function putSpawn (doc) {
  await withRetry(db.none, [
    'INSERT INTO "spawns" ("_id", "fromTxId", "toTxId", "spawn", "cachedAt", "processId") VALUES ($1, $2, $3, $4, $5, $6)',
    [doc._id, doc.fromTxId, doc.toTxId, JSON.stringify(doc.spawn), doc.cachedAt, doc.processId]
  ])
  return doc
}

export async function findSpawns (fromTxId) {
  return await withRetry(db.any, ['SELECT * FROM "spawns" WHERE "fromTxId" = $1', [fromTxId]])
}

export async function deleteSpawn (id) {
  await withRetry(db.none, ['DELETE FROM "spawns" WHERE "_id" = $1', [id]])
  return id
}

export async function putMonitor (doc) {
  const operation = async () => {
    const existingMonitor = await db.oneOrNone('SELECT * FROM "monitored_processes" WHERE "_id" = $1', [doc._id])

    if (existingMonitor) {
      await db.none(
        'UPDATE "monitored_processes" SET "lastFromSortKey" = $1 WHERE "_id" = $2',
        [doc.lastFromSortKey, doc._id]
      )
    } else {
      await db.none(
        'INSERT INTO "monitored_processes" ("_id", "authorized", "lastFromSortKey", "interval", "block", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
        [doc._id, doc.authorized, doc.lastFromSortKey, doc.interval, JSON.stringify(doc.block), doc.createdAt]
      )
    }

    return doc
  }

  return await withRetry(operation, [])
}

export async function getMonitor (id) {
  return await withRetry(db.oneOrNone, ['SELECT * FROM "monitored_processes" WHERE "_id" = $1', [id]])
}

export async function findMonitors () {
  return await withRetry(async () => {
    const docs = await db.any('SELECT * FROM "monitored_processes"')
    return docs.map(doc => ({
      ...doc,
      createdAt: parseInt(doc.createdAt)
    }))
  }, [])
}

export default {
  putMsg,
  getMsg,
  getMonitor,
  findMsgs,
  putSpawn,
  findSpawns,
  putMonitor,
  findMonitors,
  deleteMsg,
  deleteSpawn
}
