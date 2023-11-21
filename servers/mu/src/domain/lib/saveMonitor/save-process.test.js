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
            assert.equal(process.block, 1234567)
            assert.equal(process.interval, '5-seconds')
            assert.notEqual(process.createdAt, null)
        },
        logger
      })
  
      const result = await save({
            tx: {
                processId: 'pid-1',
                block: 1234567,
                interval: '5-seconds',
                lastFromSortKey: 'sort-key'
            }
      }).toPromise()
    })
})