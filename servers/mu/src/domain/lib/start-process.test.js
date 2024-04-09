import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { startWith } from './start-process.js'

const logger = createLogger('ao-mu:startWith')

describe('startWith', () => {
  test('start a process monitor', async () => {
    const start = startWith({
      startProcessMonitor: async (process) => {
        assert.equal(process.id, 'pid-1')
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
