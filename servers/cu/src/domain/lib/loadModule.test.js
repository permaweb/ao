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
      logger
    })

    const result = await loadModule({ id: PROCESS, tags: [{ name: 'Module', value: 'foobar' }] }).toPromise()
    assert.equal(result.module.byteLength, 17)
    assert.equal(result.moduleId, 'foobar')
    assert.equal(result.id, PROCESS)
  })
})
