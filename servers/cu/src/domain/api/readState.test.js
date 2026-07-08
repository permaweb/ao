import { afterEach, describe, test } from 'node:test'
import assert from 'node:assert'

import {
  createReadStateStopSignal,
  pendingReadState,
  stopPendingReadStatesForProcess
} from './readState.js'

describe('readState pending operations', () => {
  afterEach(() => {
    pendingReadState.clear()
  })

  test('stops all pending readStates for an exact process id', async () => {
    const processId = 'process-123'
    const key = `${processId},1783145995380,2075923,,false`
    const otherKey = `${processId}4,1783145995380,2075923,,false`
    const signal = createReadStateStopSignal({ processId, key })
    const otherSignal = createReadStateStopSignal({ processId: `${processId}4`, key: otherKey })
    const pending = Promise.race([new Promise(() => {}), signal.stopped])

    pendingReadState.set(key, {
      startTime: new Date(),
      pending,
      stop: signal.stop
    })
    pendingReadState.set(otherKey, {
      startTime: new Date(),
      pending: Promise.race([new Promise(() => {}), otherSignal.stopped]),
      stop: otherSignal.stop
    })

    const res = stopPendingReadStatesForProcess({ processId })

    assert.equal(res.processId, processId)
    assert.equal(res.count, 1)
    assert.deepEqual(res.stopped, [key])
    assert.equal(pendingReadState.has(key), false)
    assert.equal(pendingReadState.has(otherKey), true)
    await assert.rejects(
      pending,
      (err) => {
        assert.equal(err.name, 'ReadStateStopped')
        assert.equal(err.status, 409)
        assert.equal(err.processId, processId)
        assert.equal(err.pendingKey, key)
        return true
      }
    )
  })
})
