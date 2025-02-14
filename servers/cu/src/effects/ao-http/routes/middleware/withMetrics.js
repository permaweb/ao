import { always } from 'ramda'

import { histogramWith, summaryWith } from '../../../metrics.js'

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

/**
 * A middleware that, given functions to generate custom labels and traces,
 * returns a function that, given the next handler in the chain, will
 * observe the request time, and adds it to the histogram.
 *
 * This can be composed onto any route, to gather http duration metrics, along
 * with tracesFrom to add per-request traces ie. process id
 */
export const withMetrics = ({ labelsFrom = always({}), tracesFrom = always({}) }) => {
  function labelsFromReq (req) {
    return {
      ...labelsFrom(req),
      /**
       * See https://fastify.dev/docs/latest/reference/request
       */
      method: req.method,
      route: req.routeOptions.url
    }
  }

  function labelsFromRes (res) {
    return {
      status: res.statusCode,
      statusGroup: `${Math.floor(res.statusCode / 100)}xx`
    }
  }

  return (handler) => (req, res) => {
    const labels = labelsFromReq(req)
    const traces = tracesFrom(req)

    const stop = histogram.startTimer(labels, traces)
    const stopSummary = summary.startTimer(labels, traces)

    return Promise.resolve()
      .then(() => handler(req, res))
      .finally(() => {
        const labels = labelsFromRes(res)
        stop(labels, traces)
        stopSummary(labels, traces)
      })
  }
}
