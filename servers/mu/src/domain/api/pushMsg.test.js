import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { pushMsgWith } from './pushMsg.js'
import { Resolved } from 'hyper-async'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}

describe('pushMsgWith', () => {
  describe('Push message from result', () => {
    describe('push message', () => {
      test('push message', async () => {
        const pushMsg = pushMsgWith({
          selectNode: async (res) => 'cu-url',
          fetchResult: (res) => {
            const msg1 = { Tags: [{ name: 'Data-Protocol', value: 'ao' }], Target: 'target-pid', Anchor: '0000001' }
            return {
              ...res,
              Messages: [msg1],
              Spawns: [],
              Assignments: []
            }
          },
          fetchTransactions: async(ctx) => {
            return {
              data: {
                transactions: {
                  edges: [
                    {
                      node: { block: { height: 1572105 } }
                    }
                  ]
                }
              }
            }
          },
          crank: (res) => {
            assert.ok(res.msgs.length === 1)
            return Resolved()
          },
          logger,
          ALLOW_PUSHES_AFTER: 1572103
        })

        const { crank } = await pushMsg({
          tx: { id: 'message-id', processId: 'process-id' },
          number: 0,
          initialTxId: 'message-id',
          logId: 'asdf',
          messageId: 'message-id'
        }).toPromise()

        await crank().toPromise()
      })
    })
  })
})
