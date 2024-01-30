/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'

import { doesExceedMaximumHeapSizeSchema } from '../dal.js'
import { doesExceedMaximumHeapSizeWith } from './wasm.js'

describe('wasm', () => {
  describe('doesExceedMaximumHeapSize', () => {
    test('returns whether the heap size exceeds the max', async () => {
      const doesExceedMaximumHeapSize = doesExceedMaximumHeapSizeSchema.implement(
        doesExceedMaximumHeapSizeWith({
          PROCESS_WASM_HEAP_MAX_SIZE: 10
        })
      )

      const tenChars = '1234567890'

      assert.equal(
        await doesExceedMaximumHeapSize({ heap: Buffer.from(tenChars, 'utf-8') }),
        false
      )
      assert.equal(
        await doesExceedMaximumHeapSize({ heap: Buffer.from(tenChars + '1', 'utf-8') }),
        true
      )
    })
  })
})
