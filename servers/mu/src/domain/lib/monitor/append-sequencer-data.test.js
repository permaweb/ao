import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { appendSequencerDataWith } from './append-sequencer-data.js'

const logger = createLogger('ao-mu:saveMonitor')

describe('appendSequencerData', () => {
  test('append sequencer data to ctx.tx', async () => {
    const appendSequencerData = appendSequencerDataWith({
      fetchSequencerProcess: async (processId, suUrl) => {
        assert.equal(processId, 'pid-1')
        assert.equal(suUrl, 'su-1')
        return {
          id: 'pid-1',
          tags: [
            { name: 'Scheduled-Interval', value: '5-seconds' }
          ]
        }
      },
      locateProcess: async (processId) => {
        assert.equal(processId, 'pid-1')
        return { url: 'su-1' }
      },
      logger
    })

    const result = await appendSequencerData({
      tx: {
        processId: 'pid-1'
      }
    }).toPromise()

    assert.equal(result.sequencerData.id, 'pid-1')
  })
})
