import { describe, test } from 'node:test'
import assert from 'node:assert'
import { withTimerMetricsFetch } from './with-timer-metrics-fetch.js'

describe('withTimerMetricsFetch', () => {
  describe('should start and stop the timer with expected labels and traces', () => {
    test('when the original function is successful', async () => {
      let startTimerCalled = false
      let stopTimerCalled = false
      const metricsFunction = withTimerMetricsFetch({
        timer: {
          startTimer (startLabels, traces) {
            startTimerCalled = true
            assert.deepEqual(startLabels, { foo: 'bar', method: 'GET' })
            assert.deepEqual(traces, { baz: 1 })
            return (stopLabels, traces) => {
              stopTimerCalled = true
              assert.deepEqual(stopLabels, { bar: false, status: 200, statusGroup: '2xx' })
              assert.deepEqual(traces, { baz: 1 })
            }
          }
        },
        fetch: () => Promise.resolve(new Response({ message: 'Success' }, { status: 200 })),
        startLabelsFrom: () => ({ foo: 'bar' }),
        tracesFrom: () => ({ baz: 1 }),
        stopLabelsFrom: () => ({ bar: false })
      })

      await metricsFunction('someUrl')

      assert.equal(startTimerCalled, true)
      assert.equal(stopTimerCalled, true)
    })

    test('when the original function rejects', async () => {
      let startTimerCalled = false
      let stopTimerCalled = false
      let stopLabels = {}
      let stopTraces = {}
      const metricsFunction = withTimerMetricsFetch({
        timer: {
          startTimer (startLabels, traces) {
            startTimerCalled = true
            assert.deepEqual(startLabels, { foo: 'bar', method: 'GET' })
            assert.deepEqual(traces, { baz: 1 })
            return (returnedStopLabels, traces) => {
              stopTimerCalled = true
              stopLabels = returnedStopLabels
              stopTraces = traces
            }
          }
        },
        fetch: () => Promise.reject(new DOMException('I am an error', 'ThisIsAStubbedError')),
        startLabelsFrom: () => ({ foo: 'bar' }),
        tracesFrom: () => ({ baz: 1 }),
        stopLabelsFrom: () => ({ bar: false })
      })

      await metricsFunction('some url')
        .then(() => assert.fail('should not resolve the original function'))
        .catch((err) => {
          assert.equal(err.message, 'I am an error')
        })

      assert.equal(startTimerCalled, true)
      assert.equal(stopTimerCalled, true)
      assert.deepEqual(stopLabels, { bar: false, errorType: 'ThisIsAStubbedError' })
      assert.deepEqual(stopTraces, { baz: 1 })
    })
  })
})
