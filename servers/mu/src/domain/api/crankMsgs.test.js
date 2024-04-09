import { describe, test } from 'node:test'
import * as assert from 'node:assert'
import { of } from 'hyper-async'

import { createLogger } from '../logger.js'
import { crankMsgsWith } from './crankMsgs.js'

const logger = createLogger('ao-mu:crankMsgs')

describe('processMsgsWith', () => {
  test('crank assignments', async () => {
    let processAssignCallCount = 0
    const processAssignSpy = () => {
      processAssignCallCount++
    }
    const crankMsgs = crankMsgsWith({
      processAssign: (ctx) => {
        processAssignSpy()
        assert.equal(ctx.assign.txId, 'id-1')
        assert.ok(
          ctx.assign.processId === 'pid-1' || ctx.assign.processId === 'pid-2'
        )
        return of({
          ...ctx,
          // have the Assignment result in a Message
          msgs: [{
            id: 'message-id-1'
          }],
          spawns: [],
          assigns: []
        })
      },
      processMsg: (ctx) => {
        assert.equal(ctx.cachedMsg.id, 'message-id-1')
        return of({
          ...ctx,
          msgs: [],
          spawns: [],
          assigns: []
        })
      },
      processSpawn: (ctx) => {
        of(ctx)
      },
      logger
    })

    await crankMsgs({
      msgs: [],
      spawns: [],
      assigns: [
        { Processes: ['pid-1', 'pid-2'], Message: 'id-1' },
        { Processes: ['pid-1', 'pid-2'], Message: 'id-1' }
      ],
      initialTxId: 'initial-tx-id'
    }).toPromise()

    assert.strictEqual(processAssignCallCount, 4, 'processAssign was not called 4 times')
  })
})
