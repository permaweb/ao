function metricsMessageHandler (payload, maximumQueueArray, maximumQueueTimeArray) {
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

export function handleWorkerQueueMessage ({ queueGauge, maximumQueueArray, maximumQueueTimeArray }) {
  return ({ payload }) => {
    if (payload.purpose === 'queue-size') {
      metricsMessageHandler(payload, maximumQueueArray, maximumQueueTimeArray)
    }
  }
}
