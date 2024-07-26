import { describe, test } from 'node:test'

import { handleWorkerMetricsMessage } from './handle-worker-metrics-message.js'
import assert from 'node:assert'

describe('handle-worker-metrics-message', () => {
  describe('queue-size', () => {
    test('arrays are updated if purpose is queue-size', () => {
      const maximumQueueArray = new Array(60).fill(0)
      const maximumQueueTimeArray = new Array(60).fill(undefined)
      const handleMessage = handleWorkerMetricsMessage({
        maximumQueueArray,
        maximumQueueTimeArray
      })

      assert.equal(maximumQueueArray[1], 0)
      assert.equal(maximumQueueTimeArray[1], undefined)
      handleMessage({ payload: { purpose: 'queue-size', size: 123, time: 1000 } })
      assert.equal(maximumQueueArray[1], 123)
      assert.equal(maximumQueueTimeArray[1], 1000)
    })

    test('arrays are not updated if purpose is not queue-size', () => {
      const maximumQueueArray = new Array(60).fill(0)
      const maximumQueueTimeArray = new Array(60).fill(undefined)
      const handleMessage = handleWorkerMetricsMessage({
        maximumQueueArray,
        maximumQueueTimeArray
      })

      handleMessage({ payload: { purpose: 'foo-bar', size: 123, time: 1000 } })
      assert.equal(maximumQueueArray[1], 0)
      assert.equal(maximumQueueTimeArray[1], undefined)
    })
  })

  describe('task-retries', () => {
    test('gauge incremented if purpose is task-retries', () => {
      let gaugeIncremented = false
      const handleMessage = handleWorkerMetricsMessage({
        retriesGauge: {
          inc: ({ retries, status }) => {
            assert.equal(retries, 3)
            assert.equal(status, 'success')
            gaugeIncremented = true
          }
        }
      })

      handleMessage({ payload: { purpose: 'task-retries', retries: 3, status: 'success' } })
      assert.ok(gaugeIncremented)
    })

    test('gauge incremented if purpose is task-retries, retry greater than 10', () => {
      let gaugeIncremented = false
      const handleMessage = handleWorkerMetricsMessage({
        retriesGauge: {
          inc: ({ retries, status }) => {
            assert.equal(retries, '10+')
            assert.equal(status, 'failure')
            gaugeIncremented = true
          }
        }
      })

      handleMessage({ payload: { purpose: 'task-retries', retries: 15, status: 'failure' } })
      assert.ok(gaugeIncremented)
    })

    test('gauge not incremented if purpose is not task-retries', () => {
      let gaugeIncremented = false
      const handleMessage = handleWorkerMetricsMessage({
        retriesGauge: { inc: () => { gaugeIncremented = true } }
      })

      handleMessage({ payload: { purpose: 'task-retries-foo' } })
      assert.ok(!gaugeIncremented)
    })
  })

  describe('error-stage', () => {
    test('gauge incremented if purpose is error-stage', () => {
      let gaugeIncremented = false
      const handleMessage = handleWorkerMetricsMessage({
        stageGauge: {
          inc: ({ stage, type }) => {
            assert.equal(stage, 'foo-stage')
            assert.equal(type, 'assign')
            gaugeIncremented = true
          }
        }
      })

      handleMessage({ payload: { purpose: 'error-stage', stage: 'foo-stage', type: 'assign' } })
      assert.ok(gaugeIncremented)
    })

    test('gauge not incremented if purpose is not error-stage', () => {
      let gaugeIncremented = false
      const handleMessage = handleWorkerMetricsMessage({
        retriesGauge: { inc: () => { gaugeIncremented = true } }
      })

      handleMessage({ payload: { purpose: 'error-stage-foo', type: 'message' } })
      assert.ok(!gaugeIncremented)
    })
  })
})
