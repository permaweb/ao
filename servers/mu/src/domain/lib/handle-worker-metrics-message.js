function queueMessageHandler (payload, maximumQueueArray, maximumQueueTimeArray) {
  const { size, time } = payload
  const seconds = Math.floor(time / 1000 % 60)

  const currSize = maximumQueueArray[seconds]
  const currTime = maximumQueueTimeArray[seconds]
  if (!currSize) {
  /**
   * If the array is empty at this seconds mark,
   * set the value to our data.
   */
    maximumQueueArray[seconds] = size
    maximumQueueTimeArray[seconds] = time
  } else if (Math.abs(time - currTime) > 1000) {
  /**
   * If the array is not empty but the time value is more than a second old
   * (ie., the value is from a minute+ ago), set the value to our data
   */
    maximumQueueArray[seconds] = size
    maximumQueueTimeArray[seconds] = time
  } else if (size > currSize) {
  /**
   * If the array has a value within this second, replace it if
   * our data is the maximum
   */
    maximumQueueArray[seconds] = size
    maximumQueueTimeArray[seconds] = time
  }
}
function retriesMessageHandler (payload, gauge) {
  gauge.inc({ retries: payload.retries >= 10 ? '10+' : payload.retries, status: payload.status })
}
function errorStageMessageHandler (payload, gauge) {
  gauge.inc({ stage: payload.stage, type: payload.type })
}
function logMessageHandler (payload, logger) {
  let { namespace, message, args } = payload

  // Set default namespace if undefined
  namespace = namespace || 'default'
  const loggerNamespace = logger.namespace

  // Check if the payload namespace matches the logger's namespace
  let logFunction
  if (namespace === loggerNamespace) {
    logFunction = logger
  } else {
    const childNamespace = namespace.split(':').pop()
    logFunction = logger.child(childNamespace)
  }

  logFunction(message, ...args)
}

export function handleWorkerMetricsMessage ({ retriesGauge, stageGauge, maximumQueueArray, maximumQueueTimeArray, logger }) {
  return ({ payload }) => {
    if (payload.purpose === 'queue-size') {
      queueMessageHandler(payload, maximumQueueArray, maximumQueueTimeArray)
    }
    if (payload.purpose === 'task-retries') {
      retriesMessageHandler(payload, retriesGauge)
    }
    if (payload.purpose === 'error-stage') {
      errorStageMessageHandler(payload, stageGauge)
    }
    if (payload.purpose === 'log') {
      logMessageHandler(payload, logger)
    }
  }
}
