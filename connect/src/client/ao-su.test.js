import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { loadProcessMetaWith, getLastSlotWith, getMessageById, getMessagesByRange } from './ao-su.js'
import { locate } from '@permaweb/ao-scheduler-utils'
import { loadProcessMetaSchema } from '../dal.js'
import { createLogger } from '../logger.js'

const logger = createLogger('ao-cu')

const SU_URL = globalThis.SU_URL || 'https://su.foo'
const PROCESS_ID = 'uPKuZ6SABUXvgaEL3ZS3ku5QR1RLwE70V6IUslmZJFI'

describe('ao-su', () => {
  test('getMessagesByRange', async () => {
    const fn = getMessagesByRange({
      fetch,
      locate
    })
    const from = Date.now() - (10 * 60 * 1000)
    const to = Date.now()
    const results = await fn({
      processId: '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc',
      from: String(from),
      to: String(to),
      limit: '1000'
    })
    assert.ok(results.edges.length > 0)
  })

  describe('getMessageById', async () => {
    const fn = getMessageById({
      fetch,
      locate
    })
    const result = await fn({
      processId: '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc',
      messageId: 'G1fpyLXiWIl_Jch5aL5BEADI8XzbsCmV7ziVqRbYDN0'
    })
    assert.equal(result.message.id, 'G1fpyLXiWIl_Jch5aL5BEADI8XzbsCmV7ziVqRbYDN0')
  })
  describe('getLastWith', async () => {
    const fn = getLastSlotWith({
      fetch,
      locate
    })
    const result = await fn({
      processId: '0syT13r0s0tgPmIed95bJnuSqaD29HQNN8D3ElLSrsc'
    })
    // console.log(result)
    assert.ok(result > 0)
  })
  describe('loadProcessMeta', () => {
    const tags = [
      {
        name: 'Contract-Src',
        value: 'gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w'
      },
      {
        name: 'SDK',
        value: 'ao'
      }
    ]

    test('return the process meta from the su', async () => {
      const loadProcessMeta = loadProcessMetaSchema.implement(
        loadProcessMetaWith({
          fetch: async (url, options) => {
            assert.equal(url, `${SU_URL}/processes/${PROCESS_ID}`)
            assert.deepStrictEqual(options, { method: 'GET', redirect: 'follow' })
            return new Response(JSON.stringify({ tags }))
          },
          cache: {
            has: (processId) => {
              assert.equal(processId, PROCESS_ID)
              return false
            },
            set: (processId, meta) => {
              assert.equal(processId, PROCESS_ID)
              assert.deepStrictEqual(meta, { tags })
            }
          },
          logger
        }))

      const res = await loadProcessMeta({
        suUrl: SU_URL,
        processId: PROCESS_ID
      })

      assert.deepStrictEqual(res, { tags })
    })

    test('return the process meta from the ', async () => {
      const loadProcessMeta = loadProcessMetaSchema.implement(
        loadProcessMetaWith({
          fetch: async (url) => assert.fail('Should not call su if cached'),
          cache: {
            has: (processId) => {
              assert.equal(processId, PROCESS_ID)
              return true
            },
            get: (processId) => {
              assert.equal(processId, PROCESS_ID)
              return { tags }
            }
          },
          logger
        }))

      const res = await loadProcessMeta({
        suUrl: SU_URL,
        processId: PROCESS_ID
      })

      assert.deepStrictEqual(res, { tags })
    })
  })
})
