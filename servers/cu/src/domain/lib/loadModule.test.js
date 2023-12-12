import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadModuleWith } from './loadModule.js'

const PROCESS = 'contract-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadModule', () => {
  test('append module and module id', async () => {
    const loadModule = loadModuleWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      logger
    })

    const result = await loadModule({ id: PROCESS, tags: [{ name: 'Module', value: 'foobar' }] }).toPromise()
    assert.equal(result.module.byteLength, 17)
    assert.equal(result.moduleId, 'foobar')
    assert.equal(result.id, PROCESS)
  })

  test('throw if "Module-Format" is not emscripten', async () => {
    const loadModule = loadModuleWith({
      loadTransactionData: async (_id) =>
        new Response(JSON.stringify({ hello: 'world' })),
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasi32' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      logger
    })

    await loadModule({ id: PROCESS, tags: [{ name: 'Module', value: 'foobar' }] }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Module-Format': only 'emscripten' module format is supported by this CU"))
  })
})
