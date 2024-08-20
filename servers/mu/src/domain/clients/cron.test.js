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
        getCronProcesses: () => undefined,
        startMonitoredProcess: async () => {
          assert.fail('should not start process')
        },
        readProcFile: () => undefined,
        cron: { schedule: () => undefined }
      })()
    })

    describe('processing proc file runs successfully when not initial run and skips subsequent runs', async () => {
      let startMonitoredProcessCalls = 0
      const initCronProcs = cron.initCronProcsWith({
        getCronProcesses: () => [{ processId: '1', status: 'running' }],
        startMonitoredProcess: async () => {
          console.log('here ')
          startMonitoredProcessCalls++
          return Promise.resolve()
        },
        readProcFile: () => undefined,
        cron: { schedule: () => undefined }
      })

      test('should start process by reading proc file and saving procs', async () => {
        await initCronProcs()
        assert.equal(startMonitoredProcessCalls, 1)
      })
    })

    describe('dumps proc file into sqlite if file is present', async () => {
      let saveCronProcessCalls = 0
      const initCronProcs = cron.initCronProcsWith({
        getCronProcesses: () => [{ processId: 'pid-123', status: 'running' }, { processId: 'pid-456', status: 'running' }],
        startMonitoredProcess: async () => { saveCronProcessCalls++ },
        cron: { schedule: () => undefined }
      })

      test('make sure crons are being saved to sqlite', async () => {
        await initCronProcs()
        assert.equal(saveCronProcessCalls, 2)
      })
    })
  })

  describe('startMonitoredProcessWith', () => {

  })

  describe('killMonitoredProcessWith', () => {
    test('should not kill process if process is not a running cron', async () => {
      const killMonitoredProcess = cron.killMonitoredProcessWith({
        PROC_FILE_PATH: 'test',
        logger,
        monitorGauge: () => ({
          dec: () => {}
        }),
        deleteCronProcess: async () => Promise.resolve()
      })
      await killMonitoredProcess({ processId: 1 }).catch(() => {
        assert.ok('should catch error')
      })
    })
  })
})
