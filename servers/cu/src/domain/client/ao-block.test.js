/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { prop, uniqBy } from 'ramda'

import { createLogger } from '../logger.js'
import { loadBlocksMetaSchema } from '../dal.js'
import { loadBlocksMetaWith } from './ao-block.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const logger = createLogger('ao-cu')

describe('ao-block', () => {
  describe.todo('findBlocks')
  describe.todo('saveBlocks')

  describe('loadBlocksMeta', () => {
    test('load the block data across multiple pages', async () => {
      const loadBlocksMeta = loadBlocksMetaSchema.implement(loadBlocksMetaWith({
        fetch,
        GATEWAY_URL,
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
