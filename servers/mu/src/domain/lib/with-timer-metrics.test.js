import { describe, test } from 'node:test'
import { withTimerMetrics } from './with-timer-metrics.js'
import assert from 'node:assert'

describe('withTimerMetrics', () => {
  test('should throw an error if the timer dependency is invalid', () => {
    assert.throws(() => withTimerMetrics({ timer: {} }), {
      name: 'Error',
      message: 'Timer must implement a startTimer function'
    }, 'Timer must implement a startTimer function')

    assert.throws(() => withTimerMetrics({ timer: { startTimer: 'not a function' } }), {
      name: 'Error',
      message: 'Timer must implement a startTimer function'
    }, 'Timer startTimer property must be a function')

    assert.throws(() => withTimerMetrics({}), {
      name: 'Error',
      message: 'Timer must implement a startTimer function'
    }, 'Timer dependency is required')
  })

  test('should return the original function result', async () => {
    const metricsFunction = withTimerMetrics({
      timer: {
        startTimer () {
          return () => {}
        }
      }
    })(() => 'hello world')
    const functionResult = await metricsFunction()
    assert.equal(functionResult, 'hello world')
  })

  describe('should start and stop the timer with expected labels and traces', () => {
    test('when the original function is successful', async () => {
      let startTimerCalled = false
      let stopTimerCalled = false
      const metricsFunction = withTimerMetrics({
        timer: {
          startTimer (startLabels, traces) {
            startTimerCalled = true
            assert.deepEqual(startLabels, { foo: 'bar' })
            assert.deepEqual(traces, { baz: 1 })
            return (stopLabels, traces) => {
              stopTimerCalled = true
              assert.deepEqual(stopLabels, { bar: false })
              assert.deepEqual(traces, { baz: 1 })
            }
          }
        },
        startLabelsFrom: () => ({ foo: 'bar' }),
        tracesFrom: () => ({ baz: 1 }),
        stopLabelsFrom: () => ({ bar: false })
      })(() => Promise.resolve('hello world'))

      await metricsFunction()

      assert.equal(startTimerCalled, true)
      assert.equal(stopTimerCalled, true)
    })

    test('when the original function rejects', async () => {
      let startTimerCalled = false
      let stopTimerCalled = false
      const metricsFunction = withTimerMetrics({
        timer: {
          startTimer (startLabels, traces) {
            startTimerCalled = true
            assert.deepEqual(startLabels, { foo: 'bar' })
            assert.deepEqual(traces, { baz: 1 })
            return (stopLabels, traces) => {
              stopTimerCalled = true
              assert.deepEqual(stopLabels, { bar: false })
              assert.deepEqual(traces, { baz: 1 })
            }
          }
        },
        startLabelsFrom: () => ({ foo: 'bar' }),
        tracesFrom: () => ({ baz: 1 }),
        stopLabelsFrom: () => ({ bar: false })
        // eslint-disable-next-line prefer-promise-reject-errors
      })(() => Promise.reject('I am an error'))

      await metricsFunction()
        .then(() => assert.fail('should not resolve the original function'))
        .catch((err) => assert.equal(err, 'I am an error'))

      assert.equal(startTimerCalled, true)
      assert.equal(stopTimerCalled, true)
    })
  })
})
