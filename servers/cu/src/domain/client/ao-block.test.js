/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { prop, uniqBy } from 'ramda'

import { createLogger } from '../logger.js'
import { findBlocksSchema, loadBlocksMetaSchema, saveBlocksSchema } from '../dal.js'
import { findBlocksWith, loadBlocksMetaWith, saveBlocksWith } from './ao-block.js'

const GRAPHQL_URL = globalThis.GRAPHQL_URL || 'https://arweave.net/graphql'
const logger = createLogger('ao-cu')

describe('ao-block', () => {
  describe('findBlocks', () => {
    test('find the blocks', async () => {
      const findBlocks = findBlocksSchema.implement(
        findBlocksWith({
          db: {
            query: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [123, 456])
              return [
                { height: 123, timestamp: 123 },
                { height: 124, timestamp: 345 },
                { height: 125, timestamp: 456 }
              ]
            }
          }
        })
      )

      const res = await findBlocks({ minHeight: 123, maxTimestamp: 456 })
      assert.deepStrictEqual(res, [
        { height: 123, timestamp: 123 },
        { height: 124, timestamp: 345 },
        { height: 125, timestamp: 456 }
      ])
    })

    test('return an empty array if no blocks are found', async () => {
      const findBlocks = findBlocksSchema.implement(
        findBlocksWith({
          db: {
            query: async ({ parameters }) => []
          }
        })
      )

      const res = await findBlocks({ minHeight: 123, maxTimestamp: 456 })
      assert.deepStrictEqual(res, [])
    })
  })

  describe('saveBlocks', () => {
    test('save the blocks', async () => {
      const saveBlocks = saveBlocksSchema.implement(
        saveBlocksWith({
          db: {
            run: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
                [123, 123, 123],
                [124, 124, 345],
                [125, 125, 456]
              ])
            }
          }
        })
      )

      await saveBlocks([
        { height: 123, timestamp: 123 },
        { height: 124, timestamp: 345 },
        { height: 125, timestamp: 456 }
      ])
    })

    test('should noop a block if it already exists the blocks', async () => {
      const saveBlocks = saveBlocksSchema.implement(
        saveBlocksWith({
          db: {
            run: async ({ sql }) => {
              assert.ok(sql.trim().startsWith('INSERT OR IGNORE'))
            }
          }
        })
      )

      await saveBlocks([
        { height: 123, timestamp: 123 },
        { height: 124, timestamp: 345 },
        { height: 125, timestamp: 456 }
      ])
    })

    test('should do nothing if no blocks to save', async () => {
      const saveBlocks = saveBlocksSchema.implement(
        saveBlocksWith({
          db: {
            run: async () => assert.fail('should not be called if no blocks')
          }
        })
      )

      await saveBlocks([])
    })
  })

  describe('loadBlocksMeta', () => {
    test('load the block data across multiple pages', async () => {
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({
        fetch,
        GRAPHQL_URL,
        /**
         * Weird page size, so we know we are chopping off the excess
         * from the last page, correctly
         */
        pageSize: 17,
        logger
      }))

      /**
       * 1696633559000 is 1 second after block's timestamp, 51 blocks away
       * from the block at height 1276343
       */
      const res = await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 })
      assert.equal(res[0].timestamp, 1696627369 * 1000)
      assert.equal(res.length, 51)
      assert.equal(res.length, uniqBy(prop('height'), res).length)
    })
  })
})
