/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { createLogger } from '../logger.js'
import { loadModuleWith } from './loadModule.js'

const PROCESS = 'contract-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadModule', () => {
  test('append moduleId, moduleOwner, and moduleTags, moduleComputeLimit, moduleMemoryLimit', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' },
          { name: 'Compute-Limit', value: '15000' },
          { name: 'Memory-Limit', value: '15000' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    const result = await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Compute-Limit', value: '10000' },
        { name: 'Memory-Limit', value: '10000' }
      ]
    }).toPromise()

    assert.equal(result.moduleId, 'foobar')
    assert.deepStrictEqual(result.moduleTags, [
      { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Module' },
      { name: 'Compute-Limit', value: '15000' },
      { name: 'Memory-Limit', value: '15000' }
    ])
    assert.equal(result.moduleOwner, 'owner-123')
    assert.equal(result.moduleComputeLimit, 10000)
    assert.equal(result.moduleMemoryLimit, 10000)
    assert.equal(result.id, PROCESS)
  })

  test('should fallback to Module tags for Compute-Limit and Module-Limit if not on Process', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' },
          { name: 'Memory-Limit', value: '12000' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    const result = await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Compute-Limit', value: '10000' }
      ]
    }).toPromise()

    assert.equal(result.moduleId, 'foobar')
    assert.deepStrictEqual(result.moduleTags, [
      { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Module' },
      { name: 'Memory-Limit', value: '12000' }
    ])
    assert.equal(result.moduleOwner, 'owner-123')
    assert.equal(result.moduleComputeLimit, 10000)
    assert.equal(result.moduleMemoryLimit, 12000)
    assert.equal(result.id, PROCESS)
  })

  test('use module from db to set moduleId', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => assert.fail('should not load transaction meta if found in db'),
      findModule: async () => ({
        id: 'foobar',
        tags: [],
        owner: 'owner-123'
      }),
      saveModule: async () => assert.fail('should not save if foudn in db'),
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    const result = await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Compute-Limit', value: '10000' },
        { name: 'Memory-Limit', value: '10000' }
      ]
    }).toPromise()

    assert.equal(result.moduleId, 'foobar')
    assert.deepStrictEqual(result.moduleTags, [])
    assert.equal(result.moduleOwner, 'owner-123')
    assert.equal(result.id, PROCESS)
  })

  test('throw if "Module-Format" is not supported', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm64-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Compute-Limit', value: '10000' },
        { name: 'Memory-Limit', value: '10000' }
      ]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.equal(err, "Tag 'Module-Format': only 'wasm32-unknown-emscripten' module format is supported by this CU"))
  })

  test('throw if "Compute-Limit" is not found', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Memory-Limit', value: '10000' }
      ]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Compute-Limit for process "${PROCESS}" exceeds supported limit` }))
  })

  test('throw if "Compute-Limit" exceeds max allowed', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => true,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Memory-Limit', value: '10000' }
      ]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Compute-Limit for process "${PROCESS}" exceeds supported limit` }))
  })

  test('throw if "Memory-Limit" is not found', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => false,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Compute-Limit', value: '10000' }
      ]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Memory-Limit for process "${PROCESS}" exceeds supported limit` }))
  })

  test('throw if "Memory-Limit" exceeds max allowed', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: {
          address: 'owner-123'
        },
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
          { name: 'Data-Protocol', value: 'ao' },
          { name: 'Type', value: 'Module' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      doesExceedModuleMaxMemory: async () => true,
      doesExceedModuleMaxCompute: async () => false,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [
        { name: 'Module', value: 'foobar' },
        { name: 'Compute-Limit', value: '10000' }
      ]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Memory-Limit for process "${PROCESS}" exceeds supported limit` }))
  })
})
