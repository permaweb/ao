/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { prop, uniqBy } from 'ramda'

import { createTestLogger } from '../domain/logger.js'
import { findBlocksSchema, loadBlocksMetaSchema, saveBlocksSchema } from '../domain/dal.js'
import { findBlocksWith, loadBlocksMetaWith, saveBlocksWith } from './ao-block.js'

const GRAPHQL_URLS = globalThis.GRAPHQL_URLS || ['https://arweave.net/graphql', 'https://arweave-search.goldsky.com/graphql']
const logger = createTestLogger({ name: 'ao-cu' })

describe('ao-block', () => {
  describe('findBlocks', () => {
    test('find the blocks', async () => {
      const findBlocks = findBlocksSchema.implement(
        findBlocksWith({
          db: {
            engine: 'sqlite',
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
            engine: 'sqlite',
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
            engine: 'sqlite',
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

    test('save the blocks, postgres', async () => {
      const saveBlocks = saveBlocksSchema.implement(
        saveBlocksWith({
          db: {
            engine: 'postgres',
            run: async ({ parameters }) => {
              assert.equal(parameters.length, 9)
              assert.deepStrictEqual(parameters, [
                123, 123, 123, 124, 124, 345, 125, 125, 456
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
            engine: 'sqlite',
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
            engine: 'sqlite',
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
        GRAPHQL_URLS,
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

    test('should backoff for 5 attempts on error', async () => {
      let errorCount = 0
      let errorCaught = false
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({
        fetch: (url) => {
          assert.equal(url, GRAPHQL_URLS[errorCount % GRAPHQL_URLS.length])
          errorCount++
          throw Error('Fetch error!')
        },
        GRAPHQL_URLS,
        pageSize: 17,
        logger
      }))
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorCaught = true
        assert.equal(e.message, 'Fetch error!')
      })
      assert.ok(errorCaught)
      assert.equal(errorCount, 5)
    })

    test('should circuit break on failure', async () => {
      let errorsCount = 0
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({
        fetch: (url) => {
          assert.equal(url, GRAPHQL_URLS[errorsCount % GRAPHQL_URLS.length])
          throw Error('Fetch error!')
        },
        GRAPHQL_URLS,
        pageSize: 17,
        logger,
        breakerOptions: {
          timeout: 5000, // 5 seconds timeout
          errorThresholdPercentage: 50, // open circuit after 50% failures
          resetTimeout: 1000 // attempt to close circuit after 1 second
        }
      }))

      /**
       * This will trigger the circuit breaker to open
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Fetch error!')
      })
      /**
       * This will fail because the breaker is open
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Can not communicate with gateway to retrieve block metadata (breaker is open)')
      })

      /**
       * Allow the circuit breaker to close again
       */
      await new Promise(resolve => setTimeout(resolve, 1500))

      /**
       * This will attempt to fetch as the circuit is closed
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Fetch error!')
      })

      assert.equal(errorsCount, 3)
    })

    test('should not circuit break on failure below volume threshold', async () => {
      let errorsCount = 0
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({
        fetch: () => {
          throw Error('Fetch error!')
        },
        GRAPHQL_URLS,
        pageSize: 17,
        logger,
        breakerOptions: {
          timeout: 5000, // 5 seconds timeout
          errorThresholdPercentage: 50, // open circuit after 50% failures
          resetTimeout: 1000, // attempt to close circuit after 1 seconds
          volumeThreshold: 20
        }
      }))

      /**
       * This will not trigger the circuit breaker to open, as the volume threshold is not met
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Fetch error!')
      })
      /**
       * This will not trigger the circuit breaker to open, as the volume threshold is not met
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Fetch error!')
      })

      /**
       * This will not trigger the circuit breaker to open, as the volume threshold is not met
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Fetch error!')
      })

      /**
       * This will not trigger the circuit breaker to open, as the volume threshold is not met
       */
      await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 }).catch((e) => {
        errorsCount++
        assert.equal(e.message, 'Fetch error!')
      })

      assert.equal(errorsCount, 4)
    })

    test('should not circuit break on failure below error threshold', async () => {
      let count = -1
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({
        fetch: async () => {
          count++
          return {
            /**
             * This will cause every 3 calls to fail (25% error rate)
             */
            ok: count % 8 < 3,
            json: () => ({
              data: {
                blocks: {
                  pageInfo: {
                    hasNextPage: false
                  },
                  edges: [
                    {
                      node: {
                        timestamp: 1696632214,
                        height: 1276377
                      }
                    },
                    {
                      node: {
                        timestamp: 1696632326,
                        height: 1276378
                      }
                    },
                    {
                      node: {
                        timestamp: 1696632474,
                        height: 1276379
                      }
                    },
                    {
                      node: {
                        timestamp: 1696632530,
                        height: 1276380
                      }
                    },
                    {
                      node: {
                        timestamp: 1696632542,
                        height: 1276381
                      }
                    },
                    {
                      node: {
                        timestamp: 1696632548,
                        height: 1276382
                      }
                    }
                  ]
                }
              }
            })
          }
        },
        GRAPHQL_URLS,
        pageSize: 5,
        logger,
        circuitResetTimeout: 60000
      }))

      let successCount = 0
      let errorCount = 0
      for (let i = 0; i < 8; i++) {
        await loadBlocksMeta({ min: 1276343, maxTimestamp: 1696633559000 })
          .catch((_e) => {
            errorCount++
          })
          .then((res) => {
            if (res) successCount++
          })
      }
      assert.equal(successCount, 6)
      assert.equal(errorCount, 2)
    })
  })
})
