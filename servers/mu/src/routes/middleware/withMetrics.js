import { always } from 'ramda'

import { histogramWith, summaryWith } from '../../domain/clients/metrics.js'
import { withTimerMetrics } from '../../domain/lib/with-timer-metrics.js'

const histogram = histogramWith()({
  name: 'http_request_duration_seconds',
  description: 'Request duration in seconds',
  buckets: [0.5, 1, 3, 5, 10, 30],
  labelNames: ['method', 'route', 'status', 'statusGroup']
})

const summary = summaryWith()({
  name: 'http_request_summary_seconds',
  description: 'Request duration in seconds summary',
  labelNames: ['method', 'route', 'status', 'statusGroup']
})

export const withMetrics = ({ labelsFrom = always({}), tracesFrom = always({}) } = {}) => {
  function labelsFromReq (req) {
    return {
      ...labelsFrom(req),
      /**
       * See https://expressjs.com/en/api.html#req
       */
      method: req.method,
      route: req.route.path
    }
  }

  function labelsFromRes (res) {
    /**
     * res could be a Response object, or anything else.
     *
     * So we derive status and statusGroup labels likely
     * to contain the value and default to 500 (which is what withErrorHandler
     * will default the response status to on a thrown/rejected error that bubbles)
     * See ./withErrorhandler.js
     */
    const status = res.statusCode || 500
    const statusGroup = status
      ? `${Math.floor(status / 100)}xx`
      : undefined

    const labels = {}
    if (status) labels.status = status
    if (statusGroup) labels.statusGroup = statusGroup

    return labels
  }

  return (handler) => withTimerMetrics({
    timer: {
      /**
       * wrap starting/stopping the histogram and summary
       * with a single "timer" managed by the util
       */
      startTimer: (labels, traces) => {
        const stop = histogram.startTimer(labels, traces)
        const stopSummary = summary.startTimer(labels, traces)

        return (stopLabels, stopTraces) => {
          stop(stopLabels, stopTraces)
          stopSummary(stopLabels, stopTraces)
        }
      }
    },
    startLabelsFrom: labelsFromReq,
    stopLabelsFrom: labelsFromRes,
    tracesFrom
  })((req, res) => Promise.resolve()
    .then(() => handler(req, res))
    .then(() => res)
  )
}
