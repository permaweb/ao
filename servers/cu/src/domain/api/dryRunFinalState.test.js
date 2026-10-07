import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createTestLogger } from '../logger.js'
import { dryRunWith } from './dryRun.js'

const PROCESS = 'process-123'
const MODULE = 'module-123'
const MEMORY = Buffer.from('arweave checkpoint memory')

const processTags = [
  { name: 'Data-Protocol', value: 'ao' },
  { name: 'Type', value: 'Process' },
  { name: 'Module', value: MODULE },
  { name: 'Compute-Limit', value: '10000' },
  { name: 'Memory-Limit', value: '16-kb' }
]

const moduleTags = [
  { name: 'Data-Protocol', value: 'ao' },
  { name: 'Type', value: 'Module' },
  { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
  { name: 'Input-Encoding', value: 'JSON-1' },
  { name: 'Output-Encoding', value: 'JSON-1' },
  { name: 'Compute-Limit', value: '10000' },
  { name: 'Memory-Limit', value: '16-kb' }
]

const checkpoint = {
  src: 'arweave',
  Memory: MEMORY,
  moduleId: MODULE,
  assignmentId: 'assignment-123',
  hashChain: 'hash-chain-123',
  timestamp: 1700000000000,
  epoch: 0,
  nonce: 42,
  ordinate: '42',
  blockHeight: 1234,
  cron: '5-minutes'
}

function createEnv (overrides = {}) {
  const schedulerCall = async () => assert.fail('the scheduler must not be called in final-state mode')

  return {
    DRYRUN_FINAL_STATE: true,
    DRY_RUN_DEFAULT_MAX_PROCESS_AGE: 60_000,
    DRY_RUN_RESULT_MAX_AGE: 60_000,
    DRY_RUN_PROCESS_CACHE_TTL: 60_000,
    setTimeout,
    clearTimeout,
    logger: createTestLogger({ name: 'ao-cu:dryRunFinalState' }),
    findLatestProcessMemory: async (args) => {
      assert.deepStrictEqual(args, { processId: PROCESS, arweaveOnly: true })
      return checkpoint
    },
    loadTransactionMeta: async (id) => {
      if (id === PROCESS) {
        return {
          owner: { address: 'process-owner', key: 'process-key' },
          tags: processTags
        }
      }
      if (id === MODULE) {
        return {
          owner: { address: 'module-owner', key: 'module-key' },
          tags: moduleTags
        }
      }
      assert.fail(`unexpected transaction metadata request for ${id}`)
    },
    isProcessOwnerSupported: async () => true,
    findModule: async () => {
      const err = new Error('module not cached')
      err.status = 404
      throw err
    },
    saveModule: async () => MODULE,
    isModuleMemoryLimitSupported: async () => true,
    isModuleComputeLimitSupported: async () => true,
    isModuleFormatSupported: async () => true,
    isModuleExtensionSupported: async () => true,
    evaluationCounter: { inc: () => {} },
    findMessageBefore: async () => assert.fail('no prior-message lookup is needed for a checkpoint dry-run'),
    saveLatestProcessMemory: async () => assert.fail('a dry-run must not save process memory'),
    loadDryRunEvaluator: async ({ moduleId }) => {
      assert.equal(moduleId, MODULE)
      return async ({ processId, Memory, message }) => {
        assert.equal(processId, PROCESS)
        assert.strictEqual(Memory, checkpoint.Memory)
        assert.equal(message.Timestamp, checkpoint.timestamp)
        assert.equal(message['Block-Height'], checkpoint.blockHeight)
        assert.equal(message.Cron, false)
        return {
          Memory,
          Messages: [],
          Assignments: [],
          Spawns: [],
          Output: { ok: true },
          GasUsed: 1
        }
      }
    },
    loadMessageMeta: schedulerCall,
    loadProcessLatest: schedulerCall,
    loadMessages: schedulerCall,
    locateProcess: schedulerCall,
    loadProcess: schedulerCall,
    ...overrides
  }
}

const request = {
  processId: PROCESS,
  dryRun: {
    Owner: 'dry-run-owner',
    Data: '',
    Tags: [{ name: 'Action', value: 'Info' }]
  }
}

describe('DRYRUN_FINAL_STATE', () => {
  test('evaluates only the submitted message on the latest Arweave checkpoint', async () => {
    const result = await dryRunWith(createEnv())(request).toPromise()

    assert.deepStrictEqual(result, {
      result: {
        Messages: [],
        Assignments: [],
        Spawns: [],
        Output: { ok: true },
        GasUsed: 1
      },
      wasCached: false
    })
  })

  test('returns 400 when no trusted Arweave checkpoint exists', async () => {
    const env = createEnv({
      findLatestProcessMemory: async (args) => { throw args },
      loadTransactionMeta: async () => assert.fail('process metadata should not load without a checkpoint')
    })

    await dryRunWith(env)(request).toPromise()
      .then(() => assert.fail('expected dry-run to reject'))
      .catch((err) => assert.deepStrictEqual(err, {
        status: 400,
        message: `No trusted Arweave checkpoint is available for process "${PROCESS}"`
      }))
  })

  test('returns 400 when a scheduler target is requested', async () => {
    const env = createEnv({
      findLatestProcessMemory: async () => assert.fail('checkpoint should not load for an unsupported target')
    })

    await dryRunWith(env)({ ...request, messageTxId: 'message-123' }).toPromise()
      .then(() => assert.fail('expected dry-run to reject'))
      .catch((err) => assert.deepStrictEqual(err, {
        status: 400,
        message: 'The "to" parameter is not supported when DRYRUN_FINAL_STATE=true; dry-runs are evaluated against the latest Arweave checkpoint'
      }))
  })
})
