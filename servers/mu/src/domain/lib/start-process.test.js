import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { startWith } from './start-process.js'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('startWith', () => {
  test('start a process monitor', async () => {
    const start = startWith({
      startProcessMonitor: async ({ processId }) => {
        assert.equal(processId, 'pid-1')
      },
      logger
    })

    await start({
      tx: {
        processId: 'pid-1'
      }
    }).toPromise()
  })
})
