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
          fetchTransactions: async (ctx) => {
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
          ALLOW_PUSHES_AFTER: 1572103,
          ENABLE_PUSH: true
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

      test("don't push if push is disabled", async () => {
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
          fetchTransactions: async (ctx) => {
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
          ALLOW_PUSHES_AFTER: 1572103,
          ENABLE_PUSH: false
        })

        let errorCaught = false
        await pushMsg({
          tx: { id: 'message-id', processId: 'process-id' },
          number: 0,
          initialTxId: 'message-id',
          logId: 'asdf',
          messageId: 'message-id'
        }).toPromise().catch((err) => {
          errorCaught = true
          assert.ok(err === 'Push is disabled')
        })

        assert.ok(errorCaught)
      })

      test('skip block height check with valid token', async () => {
        const testToken = 'test-secret-token-123'
        let fetchTransactionsCalled = false

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
          fetchTransactions: async (ctx) => {
            fetchTransactionsCalled = true
            return {
              data: {
                transactions: {
                  edges: [
                    {
                      node: { block: { height: 100 } }
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
          ALLOW_PUSHES_AFTER: 1572103,
          ENABLE_PUSH: true,
          SKIP_REPUSH_CHECKS_TOKEN: testToken
        })

        const { crank } = await pushMsg({
          tx: { id: 'message-id', processId: 'process-id' },
          number: 0,
          initialTxId: 'message-id',
          logId: 'asdf',
          messageId: 'message-id',
          skipRepushChecksToken: testToken
        }).toPromise()

        await crank().toPromise()

        // Verify that block height check was skipped
        assert.ok(!fetchTransactionsCalled, 'fetchTransactions should not be called when token is valid')
      })

      test('do not skip block height check with invalid token', async () => {
        const testToken = 'test-secret-token-123'
        let fetchTransactionsCalled = false

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
          fetchTransactions: async (ctx) => {
            fetchTransactionsCalled = true
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
          ALLOW_PUSHES_AFTER: 1572103,
          ENABLE_PUSH: true,
          SKIP_REPUSH_CHECKS_TOKEN: testToken
        })

        const { crank } = await pushMsg({
          tx: { id: 'message-id', processId: 'process-id' },
          number: 0,
          initialTxId: 'message-id',
          logId: 'asdf',
          messageId: 'message-id',
          skipRepushChecksToken: 'wrong-token'
        }).toPromise()

        await crank().toPromise()

        // Verify that block height check was performed
        assert.ok(fetchTransactionsCalled, 'fetchTransactions should be called when token is invalid')
      })

      test('do not skip block height check when no token provided in request', async () => {
        const testToken = 'test-secret-token-123'
        let fetchTransactionsCalled = false

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
          fetchTransactions: async (ctx) => {
            fetchTransactionsCalled = true
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
          ALLOW_PUSHES_AFTER: 1572103,
          ENABLE_PUSH: true,
          SKIP_REPUSH_CHECKS_TOKEN: testToken
        })

        const { crank } = await pushMsg({
          tx: { id: 'message-id', processId: 'process-id' },
          number: 0,
          initialTxId: 'message-id',
          logId: 'asdf',
          messageId: 'message-id'
        }).toPromise()

        await crank().toPromise()

        // Verify that block height check was performed
        assert.ok(fetchTransactionsCalled, 'fetchTransactions should be called when no token is provided')
      })
    })
  })
})
