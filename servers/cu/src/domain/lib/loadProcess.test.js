/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createTestLogger } from '../logger.js'
import { loadProcessWith } from './loadProcess.js'

const PROCESS = 'process-123-9HdeqeuYQOgMgWucro'
const logger = createTestLogger({ name: 'ao-cu:readState' })

describe('loadProcess', () => {
  test('appends result to ctx', async () => {
    const loadProcess = loadProcessWith({
      findEvaluation: async () => { throw { status: 404 } },
      findLatestProcessMemory: async () => ({
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        assignmentId: undefined,
        hashChain: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: '0'
      }),
      saveLatestProcessMemory: async () => assert.fail('should not be called on cold_start'),
      logger
    })

    const res = await loadProcess({ id: PROCESS, ordinate: '10', to: '1697574792000' }).toPromise()

    assert.deepStrictEqual(res.result, { Memory: null })
    assert.equal(res.ordinate, '0')
    assert.equal(res.id, PROCESS)
    assert.equal(res.toOrdinate, 10)
    assert.ok(res.isColdStart)
  })

  test('use exact match from db', async () => {
    const cachedEvaluation = {
      processId: PROCESS,
      messageId: 'message-123',
      cron: '1-10-minutes',
      timestamp: 1697574792000,
      ordinate: '1',
      blockHeight: 1234,
      evaluatedAt: new Date(),
      output: {
        Messages: [
          {
            target: 'foobar',
            tags: [
              { name: 'foo', value: 'bar' }
            ]
          }
        ],
        Output: [],
        Spawns: []
      }
    }

    const loadProcess = loadProcessWith({
      findEvaluation: async () => cachedEvaluation,
      findLatestProcessMemory: async ({ processId, timestamp }) => {
        assert.fail('should not be called when exact match is found')
      },
      saveLatestProcessMemory: async () => assert.fail('should not be called if exact match if found'),
      logger
    })

    const res = await loadProcess({ id: PROCESS, ordinate: '10', to: 1697574792000 }).toPromise()
    assert.deepStrictEqual(res.result, cachedEvaluation.output)
    assert.deepStrictEqual(res.from, cachedEvaluation.timestamp)
    assert.deepStrictEqual(res.ordinate, cachedEvaluation.ordinate)
    assert.deepStrictEqual(res.fromCron, cachedEvaluation.cron)
    assert.deepStrictEqual(res.fromBlockHeight, cachedEvaluation.blockHeight)
    assert.equal(res.mostRecentAssignmentId, undefined)
    assert.equal(res.mostRecentHashChain, undefined)
    assert.equal(res.id, PROCESS)
    assert.equal(res.toOrdinate, 10)
  })

  test('use latest in cache', async () => {
    const cached = {
      src: 'memory',
      Memory: Buffer.from('hello world'),
      moduleId: 'module-123',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      timestamp: 1697574792000,
      epoch: 0,
      nonce: 11,
      blockHeight: 123,
      cron: undefined,
      ordinate: '11'
    }

    const loadProcess = loadProcessWith({
      findEvaluation: async () => { throw { status: 404 } },
      findLatestProcessMemory: async ({ processId, timestamp }) => cached,
      saveLatestProcessMemory: async () => assert.fail('should not be called if memory'),
      logger
    })

    const res = await loadProcess({ id: PROCESS, ordinate: '10', to: 1697574792000 }).toPromise()
    assert.deepStrictEqual(res.from, cached.timestamp)
    assert.deepStrictEqual(res.ordinate, cached.ordinate)
    assert.deepStrictEqual(res.fromCron, cached.cron)
    assert.deepStrictEqual(res.fromBlockHeight, cached.blockHeight)
    assert.deepStrictEqual(res.mostRecentAssignmentId, cached.assignmentId)
    assert.deepStrictEqual(res.mostRecentHashChain, cached.hashChain)
    assert.equal(res.id, PROCESS)
    assert.equal(res.toOrdinate, 10)
  })

  test('backfill cache if latest from arweave or file', async () => {
    const cached = {
      Memory: Buffer.from('hello world'),
      moduleId: 'module-123',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      timestamp: 1697574792000,
      epoch: 0,
      nonce: 11,
      blockHeight: 123,
      cron: undefined,
      ordinate: '11'
    }

    const loadProcess = loadProcessWith({
      findEvaluation: async () => { throw { status: 404 } },
      findLatestProcessMemory: async ({ processId, timestamp }) => cached,
      saveLatestProcessMemory: async (args) => {
        assert.deepStrictEqual(args, {
          processId: PROCESS,
          Memory: cached.Memory,
          moduleId: cached.moduleId,
          assignmentId: cached.assignmentId,
          hashChain: cached.hashChain,
          timestamp: cached.timestamp,
          epoch: cached.epoch,
          nonce: cached.nonce,
          ordinate: cached.ordinate,
          blockHeight: cached.blockHeight,
          cron: cached.cron
        })
      },
      logger
    })

    cached.src = 'record'
    await loadProcess({ id: PROCESS, ordinate: '10', to: 1697574792000 }).toPromise()

    cached.src = 'arweave'
    await loadProcess({ id: PROCESS, ordinate: '10', to: 1697574792000 }).toPromise()
  })

  test('backfill cache if latest from memory drained to file', async () => {
    const cached = {
      Memory: Buffer.from('hello world'),
      moduleId: 'module-123',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      timestamp: 1697574792000,
      epoch: 0,
      nonce: 11,
      blockHeight: 123,
      cron: undefined,
      ordinate: '11'
    }

    const loadProcess = loadProcessWith({
      findEvaluation: async () => { throw { status: 404 } },
      findLatestProcessMemory: async ({ processId, timestamp }) => cached,
      saveLatestProcessMemory: async (args) => {
        assert.deepStrictEqual(args, {
          processId: PROCESS,
          Memory: cached.Memory,
          moduleId: cached.moduleId,
          assignmentId: cached.assignmentId,
          hashChain: cached.hashChain,
          timestamp: cached.timestamp,
          epoch: cached.epoch,
          nonce: cached.nonce,
          ordinate: cached.ordinate,
          blockHeight: cached.blockHeight,
          cron: cached.cron
        })
      },
      logger
    })

    cached.src = 'memory'
    cached.fromFile = 'state-process-123.dat'
    await loadProcess({ id: PROCESS, ordinate: '10', to: 1697574792000 }).toPromise()
  })

  test('bubble 425 if latestProcessMemory is later than requested message', async () => {
    const loadProcess = loadProcessWith({
      findEvaluation: async () => { throw { status: 404 } },
      findLatestProcessMemory: async ({ processId, timestamp }) => {
        throw { status: 425, ordinate: '12', message: 'foobar' }
      },
      saveLatestProcessMemory: async () => assert.fail('should not be called if memory'),
      logger
    })

    // timestamp
    await loadProcess({ id: PROCESS, to: 1697574792000 })
      .toPromise()
      .then(() => assert.fail('should have rejected'))
      .catch((err) => assert.deepStrictEqual(err, {
        status: 425,
        message: 'message at timestamp 1697574792000 not found cached, and earlier than latest known nonce 12'
      }))

    // ordinate
    await loadProcess({ id: PROCESS, ordinate: 11 })
      .toPromise()
      .then(() => assert.fail('should have rejected'))
      .catch((err) => assert.deepStrictEqual(err, {
        status: 425,
        message: 'message at nonce 11 not found cached, and earlier than latest known nonce 12'
      }))
  })
})
