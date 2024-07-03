function metricsMessageHandler (payload, gauge) {
  if (payload.action === 'enqueue') {
    gauge.inc()
  }
  if (payload.action === 'dequeue') {
    gauge.dec()
  }
}

export function handleWorkerQueueMessage ({ queueGauge }) {
  return ({ payload }) => {
    if (payload.purpose === 'metrics') {
      metricsMessageHandler(payload, queueGauge)
    }
  }
}
