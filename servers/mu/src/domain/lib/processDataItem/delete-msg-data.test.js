import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../../logger.js'
import { deleteMsgDataWith } from './delete-msg-data.js'

const logger = createLogger('ao-mu:processMsg')

describe('deleteMsgData', () => {
  test('delete msg by id', async () => {
    const deleteMsgData = deleteMsgDataWith({
      deleteMsg: async (id) => {
        assert.equal(id, 'id-1')
      },
      logger
    })

    const result = await deleteMsgData({
      cachedMsg: {
        id: 'id-1'
      }
    }).toPromise()

    assert.equal(result.cachedMsg.id, 'id-1')
  })
})
