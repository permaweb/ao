import * as assert from 'node:assert'
import { describe, test } from 'node:test'

import cron from './cron.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}
logger.child = () => {
  const tempLogger = () => undefined
  tempLogger.tap = () => (args) => {
    return args
  }
  return tempLogger
}

describe('cron', () => {
  describe('initCronProcsWith', () => {
    test('should not start process if db could not be read', async () => {
      await cron.initCronProcsWith({
        getCronProcesses: () => undefined,
        startMonitoredProcess: async () => {
          assert.fail('should not start process')
        },
        getCronProcessCursor: async () => null,
        updateCronProcessCursor: async () => {},
        logger,
        STALE_CURSOR_RANGE: 7 * 24 * 60 * 60 * 1000
      })()
    })

    describe('processing proc file runs startMonitor for each process read from the db', async () => {
      let startMonitoredProcessCalls = 0
      const initCronProcs = cron.initCronProcsWith({
        getCronProcesses: () => [{ processId: '1', status: 'running' }, { processId: '2', status: 'running' }],
        startMonitoredProcess: async () => {
          startMonitoredProcessCalls++
          return Promise.resolve()
        },
        getCronProcessCursor: async () => null,
        updateCronProcessCursor: async () => {},
        logger,
        STALE_CURSOR_RANGE: 7 * 24 * 60 * 60 * 1000
      })

      test('should start process by reading proc db and starting processes', async () => {
        await initCronProcs()
        assert.equal(startMonitoredProcessCalls, 2)
      })
    })

    describe('stale cursor handling', () => {
      test('should clear stale cursors before starting processes', async () => {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000) - 1000 // 1 second older than threshold
        const staleCursor = btoa(JSON.stringify({ timestamp: oneWeekAgo, ordinate: 1, cron: null, sort: 'ASC' }))
        
        let cursorCleared = false
        const initCronProcs = cron.initCronProcsWith({
          getCronProcesses: () => [{ processId: 'stale-process', status: 'running' }],
          getCronProcessCursor: async () => staleCursor,
          updateCronProcessCursor: async ({ cursor }) => {
            if (cursor === null) cursorCleared = true
          },
          startMonitoredProcess: async () => {},
          logger,
          STALE_CURSOR_RANGE: 7 * 24 * 60 * 60 * 1000
        })

        await initCronProcs()
        assert.ok(cursorCleared, 'Stale cursor should have been cleared')
      })

      test('should not clear fresh cursors', async () => {
        const now = Date.now()
        const freshCursor = btoa(JSON.stringify({ timestamp: now, ordinate: 1, cron: null, sort: 'ASC' }))
        
        let cursorCleared = false
        const initCronProcs = cron.initCronProcsWith({
          getCronProcesses: () => [{ processId: 'fresh-process', status: 'running' }],
          getCronProcessCursor: async () => freshCursor,
          updateCronProcessCursor: async ({ cursor }) => {
            if (cursor === null) cursorCleared = true
          },
          startMonitoredProcess: async () => {},
          logger,
          STALE_CURSOR_RANGE: 7 * 24 * 60 * 60 * 1000
        })

        await initCronProcs()
        assert.ok(!cursorCleared, 'Fresh cursor should not have been cleared')
      })

      test('should clear invalid cursors', async () => {
        const invalidCursor = 'invalid-base64-cursor'
        
        let cursorCleared = false
        const initCronProcs = cron.initCronProcsWith({
          getCronProcesses: () => [{ processId: 'invalid-cursor-process', status: 'running' }],
          getCronProcessCursor: async () => invalidCursor,
          updateCronProcessCursor: async ({ cursor }) => {
            if (cursor === null) cursorCleared = true
          },
          startMonitoredProcess: async () => {},
          logger,
          STALE_CURSOR_RANGE: 7 * 24 * 60 * 60 * 1000
        })

        await initCronProcs()
        assert.ok(cursorCleared, 'Invalid cursor should have been cleared')
      })
    })
  })

  describe('startMonitoredProcessWith', async () => {
    let monitorGaugeValue = 0
    const startMonitoredProcess = cron.startMonitoredProcessWith({
      fetch: async () => undefined,
      cron: {
        schedule: (expression, _callback) => {
          assert.equal(expression, '*/10 * * * * *')
          return {
            start: () => console.log('start'),
            stop: () => console.log('stop')
          }
        }
      },
      histogram: { startTimer: async () => undefined },
      logger,
      saveCronProcess: async ({ processId }) => assert.ok(['foo', 'bar'].includes(processId)),
      monitorGauge: {
        inc: () => {
          monitorGaugeValue++
        }
      }
    })

    test('start initial monitor of process foo', async () => {
      await startMonitoredProcess({ processId: 'foo' })
      assert.equal(monitorGaugeValue, 1)
    })
    test('start initial monitor of process bar', async () => {
      await startMonitoredProcess({ processId: 'bar' })
      assert.equal(monitorGaugeValue, 2)
    })
    test('double monitor of process foo', async () => {
      let errorCaught = false
      try {
        await startMonitoredProcess({ processId: 'foo' })
      } catch (e) {
        errorCaught = true
        assert.equal(e.message, 'Process already being monitored')
      }
      assert.equal(monitorGaugeValue, 2)
      assert.ok(errorCaught)
    })
  })

  describe('killMonitoredProcessWith', () => {
    let monitorGaugeValue = 0
    const startMonitoredProcess = cron.startMonitoredProcessWith({
      fetch: async () => undefined,
      cron: {
        schedule: (expression, _callback) => {
          assert.equal(expression, '*/10 * * * * *')
          return {
            start: () => console.log('start'),
            stop: () => console.log('stop')
          }
        }
      },
      histogram: { startTimer: async () => undefined },
      logger,
      saveCronProcess: async ({ processId }) => assert.ok(['process-123', 'process-456'].includes(processId)),
      monitorGauge: {
        inc: () => {
          monitorGaugeValue++
        }
      }
    })
    const killMonitoredProcess = cron.killMonitoredProcessWith({
      logger,
      monitorGauge: {
        dec: () => { monitorGaugeValue-- }
      },
      deleteCronProcess: async ({ processId }) => assert.ok(['process-123', 'process-456'].includes(processId))
    })

    test('should not kill process if process is not a running cron', async () => {
      let errorCaught = false
      try {
        await killMonitoredProcess({ processId: 'process-123' })
      } catch (e) {
        errorCaught = true
        assert.equal(e.message, 'Process monitor not found')
      }
      assert.ok(errorCaught)
    })

    test('should kill process monitors when they exist', async () => {
      await startMonitoredProcess({ processId: 'process-123' })
      assert.equal(monitorGaugeValue, 1)
      await startMonitoredProcess({ processId: 'process-456' })
      assert.equal(monitorGaugeValue, 2)
      await killMonitoredProcess({ processId: 'process-456' })
      assert.equal(monitorGaugeValue, 1)
      await killMonitoredProcess({ processId: 'process-123' })
      assert.equal(monitorGaugeValue, 0)

      // Ensure processes were actually removed
      let errorCaught = false
      try {
        await killMonitoredProcess({ processId: 'process-123' })
      } catch (e) {
        errorCaught = true
        assert.equal(e.message, 'Process monitor not found')
      }
      assert.ok(errorCaught)
    })
  })
})
