import { logger } from '../../logger.js'
import { withTimerMetrics } from './with-timer-metrics.js'
import { always } from 'ramda'

export const withTimerMetricsFetch = ({
  timer,
  fetch,
  startLabelsFrom = always({}),
  stopLabelsFrom = always({}),
  tracesFrom = always({})
}) => withTimerMetrics({
  timer,
  startLabelsFrom: (_url, fetchOptions = {}) => {
    return {
      ...startLabelsFrom(_url, fetchOptions),
      method: fetchOptions.method ?? 'GET' // not passing method to fetch options defaults to a GET request
    }
  },
  stopLabelsFrom: (res) => {
    if (res instanceof Response === false) {
      let errorType = ''
      switch (true) {
        case res instanceof DOMException:
          errorType = res.name
          break
        case res instanceof TypeError:
          errorType = 'typeError'
          break
        default:
          errorType = 'unknownError'
          break
      }
      return {
        ...stopLabelsFrom(res),
        errorType
      }
    }
    return {
      ...stopLabelsFrom(res),
      status: res.status,
      statusGroup: `${Math.floor(res.status / 100)}xx`
    }
  },
  tracesFrom,
  logger: logger('ao-mu-metrics')
})(fetch)
