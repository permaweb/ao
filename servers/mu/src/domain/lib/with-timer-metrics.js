import { always } from 'ramda'
import { swallow } from '../utils.js'

/**
 * withTimerMetrics timer only needs to implement a function called 'startTimer' that returns a function to be invoked to stop the timer.
 * some implementations such as prometheus's histogram have additional constraints such as the labels returned from 'startLabelsFrom' and 'stopLabelsFrom'
 * need to be referenced as labels passed to the histogram itself. Any additional checks in this way are up to the implementation and are details of the specific implementation.
 */
export function withTimerMetrics ({ timer, startLabelsFrom = always({}), stopLabelsFrom = always({}), tracesFrom = always({}), logger = console.warn.bind(console) } = {}) {
  return (func) => (...funcArgs) => {
    const startLabels = startLabelsFrom(...funcArgs)
    const traces = tracesFrom(...funcArgs)
    const stop = timer.startTimer(startLabels, traces)

    const safeStop = swallow((...args) => {
      try {
        return stop(...args)
      } catch (e) {
        logger('METRICS ERROR: Error encountered when stopping timer, skipping metric observance.', e)
        throw e
      }
    })

    return Promise.resolve()
      .then(() => func(...funcArgs))
      .then((funcReturn) => {
        safeStop(stopLabelsFrom(funcReturn), traces)

        return funcReturn
      })
      .catch((funcReturn) => {
        safeStop(stopLabelsFrom(funcReturn), traces)

        throw funcReturn
      })
  }
}
