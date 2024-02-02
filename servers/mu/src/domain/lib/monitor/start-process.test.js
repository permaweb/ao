import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { startWith } from './start-process.js'

const logger = createLogger('ao-mu:saveMonitor')

describe('startWith', () => {
  test('start a process monitor', async () => {
    const save = saveWith({
      saveProcessToMonitor: async (process) => {
        assert.equal(process.id, 'pid-1')
      },
      logger
    })

    await save({
      tx: {
        processId: 'pid-1'
      },
    }).toPromise()
  })
})
