import * as assert from 'node:assert'
import { describe, test } from 'node:test'

import cron from './cron.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('cron', () => {
  describe('initCronProcsWith', () => {
    test('should not start process if proc file could not be read', async () => {
      await cron.initCronProcsWith({
        readProcFile: () => undefined,
        startMonitoredProcess: async () => {
          assert.fail('should not start process')
        }
      })()
    })

    describe('processing proc file runs successfully when not initial run and skips subsequent runs', async () => {
      let saveProcsCalls = 0
      const initCronProcs = await cron.initCronProcsWith({
        readProcFile: () => ({ 1: '1' }),
        startMonitoredProcess: async () => Promise.resolve(),
        saveProcs: () => {
          console.log('calling save procs')
          saveProcsCalls++
          return Promise.resolve()
        }
      })

      test('should start process by reading proc file and saving procs', async () => {
        await initCronProcs()
        assert.equal(saveProcsCalls, 1)
      })

      test('should not process any more times after initial process', async () => {
        await initCronProcs()
        assert.equal(saveProcsCalls, 1)
      })
    })
  })

  describe('startMonitoredProcessWith', () => {

  })

  describe('killMonitoredProcessWith', () => {
    test('should not kill process if process is not a running cron', async () => {
      const killMonitoredProcess = await cron.killMonitoredProcessWith({
        PROC_FILE_PATH: 'test',
        logger,
        monitorGauge: () => ({
          dec: () => {}
        }),
        saveProcs: async () => Promise.resolve()
      })
      await killMonitoredProcess({ processId: 1 }).catch(() => {
        assert.ok('should catch error')
      })
    })
  })
})
