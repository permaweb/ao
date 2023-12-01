import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { appendSequencerDataWith } from './append-sequencer-data.js'

const logger = createLogger('ao-mu:saveMonitor')

describe('appendSequencerData', () => {
  test('append sequencer data to ctx.tx', async () => {
    const appendSequencerData = appendSequencerDataWith({
      fetchSequencerProcess: async (processId) => {
        assert.equal(processId, 'pid-1')
        return {
          block: 1234567,
          tags: [
            { name: 'Scheduled-Interval', value: '5-seconds' }
          ]
        }
      },
      logger
    })

    const result = await appendSequencerData({
      tx: {
        processId: 'pid-1'
      }
    }).toPromise()

    assert.equal(result.tx.block, 1234567)
    assert.equal(result.tx.interval, '5-seconds')
    assert.equal(result.sequencerData.block, 1234567)
  })
})
