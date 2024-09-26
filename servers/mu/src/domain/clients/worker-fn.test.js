import 'dotenv/config'

import * as assert from 'node:assert'
import { describe, test } from 'node:test'
import { enqueueResultsWith, processResultWith, processResultsWith } from './worker-fn.js'
import { Resolved } from 'hyper-async'

const logger = () => undefined
logger.tap = () => (args) => {
  return args
}
logger.child = () => {
  const tempLogger = () => undefined
  tempLogger.tap = () => (args) => {
    return args
  }
  return tempLogger
}

describe('worker', () => {
  describe('processResultWith', () => {
    test('should process message, enqueue results if type is MESSAGE', async () => {
      let processMsgCalled = false
      const messages = ['msg1', 'msg2']
      const processResult = processResultWith({
        enqueueResults: ({ msgs }) => assert.deepStrictEqual(msgs, messages),
        processMsg: () => {
          processMsgCalled = true
          return Resolved({ msgs: messages })
        },
        processSpawn: () => assert.fail('should not call if type not SPAWN'),
        processAssign: () => assert.fail('should not call if type not ASSIGN')
      })
      await processResult({ type: 'MESSAGE' })
      assert.ok(processMsgCalled)
    })

    test('should process spawn, enqueue results if type is SPAWN', async () => {
      let processSpawnCalled = false
      const spawns = ['spawn1', 'spawn2']
      const processResult = processResultWith({
        enqueueResults: ({ spawns: enqueueSpawns }) => assert.deepStrictEqual(spawns, enqueueSpawns),
        processMsg: () => assert.fail('should not call if type not MESSAGE'),
        processSpawn: () => {
          processSpawnCalled = true
          return Resolved({ spawns })
        },
        processAssign: () => assert.fail('should not call if type not ASSIGN')
      })
      await processResult({ type: 'SPAWN' })
      assert.ok(processSpawnCalled)
    })

    test('should process assign, enqueue results if type is ASSIGN', async () => {
      let processAssignCalled = false
      const assigns = ['assign1', 'assign2']
      const processResult = processResultWith({
        enqueueResults: ({ assigns: enqueueAssigns }) => assert.deepStrictEqual(assigns, enqueueAssigns),
        processMsg: () => assert.fail('should not call if type not MESSAGE'),
        processSpawn: () => assert.fail('should not call if type not SPAWN'),
        processAssign: () => {
          processAssignCalled = true
          return Resolved({ assigns })
        }
      })
      await processResult({ type: 'ASSIGN' })
      assert.ok(processAssignCalled)
    })
  })

  describe('enqueueResultsWith', () => {
    const expectedResults = [
      {
        type: 'MESSAGE',
        cachedMsg: {
          initialTxId: 'tx-1',
          fromProcessId: 'process-1',
          parentId: 'parent-1'
        },
        initialTxId: 'tx-1',
        messageId: 'tx-1',
        processId: 'process-1',
        parentId: 'parent-1',
        logId: '1a8e99e2cc202383'
      },
      {
        type: 'MESSAGE',
        cachedMsg: {
          initialTxId: 'tx-2',
          fromProcessId: 'process-2',
          parentId: 'parent-2'
        },
        initialTxId: 'tx-2',
        messageId: 'tx-2',
        processId: 'process-2',
        parentId: 'parent-2',
        logId: 'd86a6add24fc0d1e'
      },
      {
        type: 'SPAWN',
        cachedSpawn: { initialTxId: 'tx-3', processId: 'process-3', parentId: 'parent-3' },
        initialTxId: 'tx-3',
        messageId: 'tx-3',
        processId: 'process-3',
        parentId: 'parent-3',
        logId: '1243071dc1c64675'
      },
      {
        type: 'SPAWN',
        cachedSpawn: { initialTxId: 'tx-4', processId: 'process-4', parentId: 'parent-4' },
        initialTxId: 'tx-4',
        messageId: 'tx-4',
        processId: 'process-4',
        parentId: 'parent-4',
        logId: '02cf8d8b15ae06f8'
      },
      {
        type: 'ASSIGN',
        assign: {
          txId: 'tx-5',
          processId: 'process-5',
          baseLayer: null,
          exclude: null
        },
        messageId: 'tx-5',
        processId: 'process-id',
        parentId: 'parent-id',
        logId: '20f6abbcced8e0c1'
      },
      {
        type: 'ASSIGN',
        assign: {
          txId: 'tx-5',
          processId: 'process-6',
          baseLayer: null,
          exclude: null
        },
        messageId: 'tx-5',
        processId: 'process-id',
        parentId: 'parent-id',
        logId: 'dd213e75e92705ec'
      }
    ]
    let i = 0
    const enqueueResults = enqueueResultsWith({
      enqueue: (result) => {
        assert.equal(result.type, expectedResults[i].type)
        assert.equal(result.initialTxId, expectedResults[i].initialTxId)
        assert.equal(result.messageId, expectedResults[i].messageId)
        assert.equal(result.processId, expectedResults[i].processId)
        assert.equal(result.parentId, expectedResults[i].parentId)
        if (result.type === 'MESSAGE') {
          assert.deepStrictEqual(result.cachedMsg, expectedResults[i].cachedMsg)
        }
        if (result.type === 'SPAWN') {
          assert.deepStrictEqual(result.cachedSpawn, expectedResults[i].cachedSpawn)
        }
        if (result.type === 'ASSIGN') {
          assert.deepStrictEqual(result.assign, expectedResults[i].assign)
        }
        i++
      }
    })
    test('enqueue all results', () => {
      enqueueResults({
        msgs: [{ initialTxId: 'tx-1', fromProcessId: 'process-1', parentId: 'parent-1' }, { initialTxId: 'tx-2', fromProcessId: 'process-2', parentId: 'parent-2' }],
        spawns: [{ initialTxId: 'tx-3', processId: 'process-3', parentId: 'parent-3' }, { initialTxId: 'tx-4', processId: 'process-4', parentId: 'parent-4' }],
        assigns: [{ Message: 'tx-5', Processes: ['process-5', 'process-6'] }],
        initialTxId: 'initial-tx-id',
        parentId: 'parent-id',
        processId: 'process-id'
      })

      assert.equal(i, expectedResults.length)
    })
  })

  describe('processResultsWith', () => {
    test('process two tasks, throw error on third and re-enqueue', async () => {
      const enqueuedTasks = [{
        id: 1,
        retries: 0,
        stage: 'start',
        type: 'MESSAGE'
      }, {
        id: 2,
        retries: 0,
        stage: 'start',
        type: 'MESSAGE'
      }, {
        id: 3,
        retries: 0,
        stage: 'start',
        type: 'MESSAGE'
      }]
      const enqueuedTasksLength = enqueuedTasks.length
      let broadcastChannelCalls = 0
      const processResults = processResultsWith({
        enqueue: (ctx) => {
          assert.equal(ctx.retries, 1)
        },
        dequeue: () => {
          if (!enqueuedTasks.length) {
            assert.fail('should not dequeue after error thrown')
          }
          return enqueuedTasks.shift()
        },
        processResult: async (result) => {
          // Throw an error on the final task
          if (result.id === enqueuedTasksLength) {
            throw new Error('error', { cause: result })
          }
          return Promise.resolve(result)
        },
        logger,
        TASK_QUEUE_MAX_RETRIES: 5,
        TASK_QUEUE_RETRY_DELAY: 700,
        broadcastChannel: {
          postMessage: () => {
            broadcastChannelCalls++
          }
        },
        whileTrue: (fn) => {
          for (let i = 0; i < enqueuedTasksLength; i++) {
            fn()
          }
        },
        setTimeout: (fn, delay) => {
          assert.equal(delay, 700)
          fn()
        }
      })
      await processResults()
        .catch((e) => e)
        .then((res) => res)
        .finally(() => {
          assert.equal(broadcastChannelCalls, enqueuedTasksLength)
        })
    })

    test('process two tasks, throw error on third and do not re-enqueue', async () => {
      const enqueuedTasks = [{
        id: 1,
        retries: 0,
        stage: 'start',
        type: 'MESSAGE'
      }, {
        id: 2,
        retries: 0,
        stage: 'start',
        type: 'MESSAGE'
      }, {
        id: 3,
        retries: 0,
        stage: 'start',
        type: 'MESSAGE'
      }]
      const enqueuedTasksLength = enqueuedTasks.length
      let broadcastChannelCalls = 0
      let enqueueCalled = false
      const processResults = processResultsWith({
        enqueue: () => {
          enqueueCalled = true
        },
        dequeue: () => {
          if (!enqueuedTasks.length) {
            assert.fail('should not dequeue after error thrown')
          }
          return enqueuedTasks.shift()
        },
        processResult: async (result) => {
          // Throw an error on the final task
          if (result.id === enqueuedTasksLength) {
            throw new Error('error', { cause: result })
          }
          return Promise.resolve(result)
        },
        logger,
        TASK_QUEUE_MAX_RETRIES: 0,
        TASK_QUEUE_RETRY_DELAY: 500,
        broadcastChannel: {
          postMessage: () => {
            broadcastChannelCalls++
          }
        },
        whileTrue: (fn) => {
          for (let i = 0; i < enqueuedTasksLength; i++) {
            fn()
          }
        },
        setTimeout: (fn, delay) => {
          assert.equal(delay, 500)
          fn()
        }
      })
      await processResults()
        .catch((e) => e)
        .then((res) => res)
        .finally(() => {
          /**
           * +1 here because the failing task broadcasts two messages:
           * Once when the result fails, and once when out of retries.
           * These are separate calls to broadcastChannel
           */
          assert.equal(broadcastChannelCalls, enqueuedTasksLength + 1)
          assert.ok(!enqueueCalled)
        })
    })
  })
})
