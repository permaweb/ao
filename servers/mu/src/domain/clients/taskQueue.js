export function createTaskQueue ({ queueId, logger }) {
  logger(`Initializing queue for queue index ${queueId}`)
  const taskQueue = []
  return taskQueue
}

export function enqueueWith ({ queue }) {
  return (task) => {
    queue.push(task)
  }
}

export function dequeueWith ({ queue }) {
  return () => {
    if (queue.length === 0) {
      return null
    }
    return queue.shift()
  }
}
