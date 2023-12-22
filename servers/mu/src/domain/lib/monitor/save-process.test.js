import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { saveWith } from './save-process.js'

const logger = createLogger('ao-mu:saveMonitor')

describe('saveWith', () => {
  test('save a process to monitor', async () => {
    const save = saveWith({
      saveProcessToMonitor: async (process) => {
        assert.equal(process.id, 'pid-1')
        assert.equal(process.lastFromTimestamp, null)
        assert.equal(process.processData.id, 'pid-1')
      },
      logger
    })

    await save({
      tx: {
        processId: 'pid-1'
      },
      sequencerData: { id: 'pid-1', tags: [] }
    }).toPromise()
  })
})
