/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { createLogger } from '../logger.js'
import { findProcessSchema, saveProcessSchema } from '../dal.js'
import { findCheckpointFileBeforeWith, findProcessWith, saveProcessWith } from './ao-process.js'

const logger = createLogger('ao-cu:ao-process')

describe('ao-process', () => {
  describe('findProcess', () => {
    test('find the process', async () => {
      const now = Math.floor(new Date().getTime() / 1000)
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => ({
              _id: 'proc-process-123',
              processId: 'process-123',
              owner: 'woohoo',
              tags: [{ name: 'foo', value: 'bar' }],
              signature: 'sig-123',
              anchor: null,
              data: 'data-123',
              block: {
                height: 123,
                timestamp: now
              },
              type: 'process'
            })
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
      assert.deepStrictEqual(res, {
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }],
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        block: {
          height: 123,
          timestamp: now
        }
      })
    })

    test('return 404 status if not found', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => { throw { status: 404 } }
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          pouchDb: {
            get: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findProcess({ processId: 'process-123' })
        .then(assert.fail)
        .catch(assert.ok)
    })
  })

  describe('saveProcess', () => {
    const now = Math.floor(new Date().getTime() / 1000)
    test('save the process', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          pouchDb: {
            put: (doc) => {
              assert.deepStrictEqual(doc, {
                _id: 'proc-process-123',
                processId: 'process-123',
                owner: 'woohoo',
                tags: [{ name: 'foo', value: 'bar' }],
                signature: 'sig-123',
                anchor: null,
                data: 'data-123',
                block: {
                  height: 123,
                  timestamp: now
                },
                type: 'process'
              })
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: 'woohoo',
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        tags: [{ name: 'foo', value: 'bar' }],
        block: {
          height: 123,
          timestamp: now
        }
      })
    })

    test('noop if the process already exists', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          pouchDb: {
            put: async () => { throw { status: 409 } }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: 'woohoo',
        tags: [{ name: 'foo', value: 'bar' }],
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        block: {
          height: 123,
          timestamp: now
        }
      })
    })
  })

  describe('findCheckpointFileBeforeWith', () => {
    test('should match all checkpoints for the process', async () => {
      const now = new Date()
      const findCheckpointFileBefore = findCheckpointFileBeforeWith({
        DIR: '/foobar',
        glob: async (str) => {
          assert.equal(str, '/foobar/checkpoint-process-123*.json')
          return [
            `/foobar/checkpoint-process-123,${now},10.json`,
            `/foobar/checkpoint-process-123,${now},11.json`
          ]
        }
      })

      await findCheckpointFileBefore({
        processId: 'process-123',
        timestamp: now,
        ordinate: '12',
        cron: undefined
      })
    })

    test('should return the single checkpoint from a file', async () => {
      const now = new Date()
      const tenSecondsAgo = `${now.getTime() - 10000}`
      const findCheckpointFileBefore = findCheckpointFileBeforeWith({
        DIR: '/foobar',
        glob: async () => [
          `/foobar/checkpoint-process-123,${tenSecondsAgo},10.json`
        ]
      })

      const res = await findCheckpointFileBefore({
        processId: 'process-123',
        timestamp: now,
        ordinate: '12',
        cron: undefined
      })

      assert.deepStrictEqual(res, {
        file: `checkpoint-process-123,${tenSecondsAgo},10.json`,
        processId: 'process-123',
        timestamp: tenSecondsAgo,
        ordinate: '10',
        cron: undefined
      })
    })

    test('should return the latest checkpoint from a file', async () => {
      const now = new Date()
      const tenSecondsAgo = `${now.getTime() - 10000}`
      const nineSecondsAgo = tenSecondsAgo + 1000
      const findCheckpointFileBefore = findCheckpointFileBeforeWith({
        DIR: '/foobar',
        glob: async (str) => [
          `/foobar/checkpoint-process-123,${tenSecondsAgo},10.json`,
          `/foobar/checkpoint-process-123,${nineSecondsAgo},11.json`
        ]
      })

      const res = await findCheckpointFileBefore({
        processId: 'process-123',
        timestamp: now,
        ordinate: '12',
        cron: undefined
      })

      assert.deepStrictEqual(res, {
        file: `checkpoint-process-123,${nineSecondsAgo},11.json`,
        processId: 'process-123',
        timestamp: nineSecondsAgo,
        ordinate: '11',
        cron: undefined
      })
    })

    test('should return undefined if no checkpoint is earlier than target', async () => {
      const now = new Date()
      const findCheckpointFileBefore = findCheckpointFileBeforeWith({
        DIR: '/foobar',
        glob: async (str) => [
          `/foobar/checkpoint-process-123,${now},10.json`,
          `/foobar/checkpoint-process-123,${now},11.json`
        ]
      })

      const res = await findCheckpointFileBefore({
        processId: 'process-123',
        timestamp: now,
        ordinate: '12',
        cron: undefined
      })

      assert.equal(res, undefined)
    })

    test('should return undefined if no checkpoints are present', async () => {
      const now = new Date()
      const findCheckpointFileBefore = findCheckpointFileBeforeWith({
        DIR: '/foobar',
        glob: async (str) => []
      })

      const res = await findCheckpointFileBefore({
        processId: 'process-123',
        timestamp: now,
        ordinate: '12',
        cron: undefined
      })

      assert.equal(res, undefined)
    })
  })

  describe.todo('findProcessMemoryBeforeWith')
  describe.todo('saveLatestProcessMemoryWith')
})
