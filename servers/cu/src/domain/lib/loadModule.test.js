/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import * as assert from 'node:assert'

import { lensIndex, remove, set } from 'ramda'

import { createLogger } from '../logger.js'
import { loadModuleWith } from './loadModule.js'

const PROCESS = 'contract-123-9HdeqeuYQOgMgWucro'
const logger = createLogger('ao-cu:readState')

describe('loadModule', () => {
  const moduleOwner = {
    address: 'owner-123',
    key: 'key-123'
  }
  const moduleTags = [
    { name: 'Data-Protocol', value: 'ao' },
    { name: 'Type', value: 'Module' },
    { name: 'Module-Format', value: 'wasm32-unknown-emscripten' },
    { name: 'Input-Encoding', value: 'JSON-1' },
    { name: 'Output-Encoding', value: 'JSON-1' },
    { name: 'Compute-Limit', value: '15000' },
    { name: 'Memory-Limit', value: '15-kb' }
  ]

  test('append moduleId, moduleOwner, moduleTags, and moduleOptions', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: moduleOwner,
        tags: moduleTags
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      isModuleMemoryLimitSupported: async ({ limit }) => {
        assert.equal(limit, 11264)
        return true
      },
      isModuleComputeLimitSupported: async ({ limit }) => {
        assert.equal(limit, 10000)
        return true
      },
      isModuleFormatSupported: async ({ format }) => {
        assert.equal(format, 'wasm32-unknown-emscripten')
        return true
      },
      isModuleExtensionSupported: async ({ extension }) => true,
      logger
    })

    const processTags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Compute-Limit', value: '10000' },
      { name: 'Memory-Limit', value: '11-kb' }
    ]

    const result = await loadModule({
      id: PROCESS,
      tags: processTags,
      owner: 'p-owner-123'
    }).toPromise()

    assert.equal(result.moduleId, 'foobar')
    assert.deepStrictEqual(result.moduleTags, moduleTags)
    assert.equal(result.moduleOwner, 'owner-123')
    assert.deepStrictEqual(result.moduleOptions, {
      format: 'wasm32-unknown-emscripten',
      inputEncoding: 'JSON-1',
      outputEncoding: 'JSON-1',
      computeLimit: 10000,
      memoryLimit: 11264,
      extensions: {},
      mode: 'Assignments',
      spawn: { id: PROCESS, owner: 'p-owner-123', tags: processTags },
      module: { id: 'foobar', owner: 'owner-123', tags: moduleTags },
      blockHeight: 100
    })
    assert.equal(result.id, PROCESS)
  })

  test('should fallback to Module tags for Compute-Limit and Module-Limit if not on Process', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: moduleOwner,
        tags: moduleTags
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      isModuleMemoryLimitSupported: async ({ limit }) => {
        assert.equal(limit, 15360)
        return true
      },
      isModuleComputeLimitSupported: async ({ limit }) => {
        assert.equal(limit, 10000)
        return true
      },
      isModuleFormatSupported: async ({ format }) => true,
      isModuleExtensionSupported: async ({ extension }) => true,
      logger
    })

    const processTags = [
      { name: 'Module', value: 'foobar' },
      { name: 'Compute-Limit', value: '10000' }
    ]

    const result = await loadModule({
      id: PROCESS,
      owner: 'p-owner-123',
      tags: processTags
    }).toPromise()

    assert.equal(result.moduleId, 'foobar')
    assert.deepStrictEqual(result.moduleTags, moduleTags)
    assert.equal(result.moduleOwner, 'owner-123')
    assert.deepStrictEqual(result.moduleOptions, {
      format: 'wasm32-unknown-emscripten',
      inputEncoding: 'JSON-1',
      outputEncoding: 'JSON-1',
      computeLimit: 10000,
      memoryLimit: 15360,
      extensions: {},
      mode: 'Assignments',
      spawn: { id: PROCESS, owner: 'p-owner-123', tags: processTags },
      module: { id: 'foobar', owner: 'owner-123', tags: moduleTags },
      blockHeight: 100
    })
    assert.equal(result.id, PROCESS)
  })

  test('use module from db', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => assert.fail('should not load transaction meta if found in db'),
      findModule: async ({ moduleId }) => {
        assert.equal(moduleId, 'foobar')
        return {
          id: 'foobar',
          tags: moduleTags,
          owner: moduleOwner
        }
      },
      saveModule: async () => assert.fail('should not save if found in db'),
      isModuleMemoryLimitSupported: async ({ limit }) => {
        assert.equal(limit, 15360)
        return true
      },
      isModuleComputeLimitSupported: async ({ limit }) => {
        assert.equal(limit, 15000)
        return true
      },
      isModuleFormatSupported: async ({ format }) => {
        assert.equal(format, 'wasm32-unknown-emscripten')
        return true
      },
      isModuleExtensionSupported: async ({ extension }) => true,
      logger
    })

    const processTags = [
      { name: 'Module', value: 'foobar' }
    ]

    const result = await loadModule({
      id: PROCESS,
      owner: 'p-owner-123',
      tags: processTags
    }).toPromise()

    assert.equal(result.moduleId, 'foobar')
    assert.deepStrictEqual(result.moduleTags, moduleTags)
    assert.deepStrictEqual(result.moduleOptions, {
      format: 'wasm32-unknown-emscripten',
      inputEncoding: 'JSON-1',
      outputEncoding: 'JSON-1',
      computeLimit: 15000,
      memoryLimit: 15360,
      extensions: {},
      mode: 'Assignments',
      spawn: { id: PROCESS, owner: 'p-owner-123', tags: processTags },
      module: { id: 'foobar', owner: 'owner-123', tags: moduleTags },
      blockHeight: 100
    })
    assert.equal(result.moduleOwner, 'owner-123')
    assert.equal(result.id, PROCESS)
  })

  describe('parse the extensions and extension options', () => {
    test('a single extension', async () => {
      const loadModule = loadModuleWith({
        loadTransactionMeta: async () => ({
          owner: moduleOwner,
          tags: [
            ...moduleTags,
            { name: 'Extension', value: 'Foo' },
            { name: 'Foo-Max', value: '10' },
            { name: 'Foo-Min', value: '2' }
          ]
        }),
        findModule: async () => { throw { status: 404 } },
        saveModule: async () => 'foobar',
        isModuleMemoryLimitSupported: async ({ limit }) => true,
        isModuleComputeLimitSupported: async ({ limit }) => true,
        isModuleFormatSupported: async ({ format }) => true,
        isModuleExtensionSupported: async ({ extension }) => true,
        logger
      })

      const res = await loadModule({
        id: PROCESS,
        tags: [
          { name: 'Module', value: 'foobar' },
          { name: 'Compute-Limit', value: '10000' },
          { name: 'Memory-Limit', value: '11-kb' }
        ]
      }).toPromise()

      assert.deepStrictEqual(res.moduleOptions.extensions, {
        Foo: [
          { name: 'Max', value: '10' },
          { name: 'Min', value: '2' }
        ]
      })
    })

    test('multiple extensions', async () => {
      const loadModule = loadModuleWith({
        loadTransactionMeta: async () => ({
          owner: moduleOwner,
          tags: [
            ...moduleTags,
            { name: 'Extension', value: 'Foo' },
            { name: 'Extension', value: 'Bar' },
            { name: 'Foo-Max', value: '10' },
            { name: 'Bar-Max', value: '15' },
            { name: 'Foo-Min', value: '2' },
            { name: 'Bar-Floor', value: '1' }
          ]
        }),
        findModule: async () => { throw { status: 404 } },
        saveModule: async () => 'foobar',
        isModuleMemoryLimitSupported: async ({ limit }) => true,
        isModuleComputeLimitSupported: async ({ limit }) => true,
        isModuleFormatSupported: async ({ format }) => true,
        isModuleExtensionSupported: async ({ extension }) => true,
        logger
      })

      const res = await loadModule({
        id: PROCESS,
        tags: [
          { name: 'Module', value: 'foobar' },
          { name: 'Compute-Limit', value: '10000' },
          { name: 'Memory-Limit', value: '11-kb' }
        ]
      }).toPromise()

      assert.deepStrictEqual(res.moduleOptions.extensions, {
        Foo: [
          { name: 'Max', value: '10' },
          { name: 'Min', value: '2' }
        ],
        Bar: [
          { name: 'Max', value: '15' },
          { name: 'Floor', value: '1' }
        ]
      })
    })
  })

  test('throw if "Input-Encoding" is not found', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: moduleOwner,
        tags: remove(3, 1, moduleTags)
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      isModuleMemoryLimitSupported: async () => true,
      isModuleComputeLimitSupported: async () => true,
      isModuleFormatSupported: async () => true,
      isModuleExtensionSupported: async ({ extension }) => true,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [{ name: 'Module', value: 'foobar' }]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, {
        status: 422,
        message: 'Input-Encoding for module "foobar" is not supported'
      }))
  })

  test('throw if "Output-Encoding" is not found', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: moduleOwner,
        tags: remove(4, 1, moduleTags)
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      isModuleMemoryLimitSupported: async () => true,
      isModuleComputeLimitSupported: async () => true,
      isModuleFormatSupported: async () => true,
      isModuleExtensionSupported: async ({ extension }) => true,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [{ name: 'Module', value: 'foobar' }]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, {
        status: 422,
        message: 'Output-Encoding for module "foobar" is not supported'
      }))
  })

  test('throw if "Module-Format" is not supported', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: moduleOwner,
        tags: set(
          lensIndex(2),
          { name: 'Module-Format', value: 'wasm64-unknown-emscripten' },
          moduleTags
        )
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      isModuleMemoryLimitSupported: async () => true,
      isModuleComputeLimitSupported: async () => true,
      isModuleFormatSupported: async () => false,
      isModuleExtensionSupported: async ({ extension }) => true,
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [{ name: 'Module', value: 'foobar' }]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, {
        status: 422,
        message: 'Module-Format for module "foobar" is not supported'
      }))
  })

  test('throw if Module Extension is not supported', async () => {
    const loadModule = loadModuleWith({
      loadTransactionMeta: async () => ({
        owner: moduleOwner,
        tags: [
          ...moduleTags,
          { name: 'Extension', value: 'Foo' },
          { name: 'Extension', value: 'Bar' },
          { name: 'Foo-Max', value: '10' },
          { name: 'Bar-Max', value: '15' },
          { name: 'Foo-Min', value: '2' },
          { name: 'Bar-Floor', value: '1' }
        ]
      }),
      findModule: async () => { throw { status: 404 } },
      saveModule: async () => 'foobar',
      isModuleMemoryLimitSupported: async ({ limit }) => true,
      isModuleComputeLimitSupported: async ({ limit }) => true,
      isModuleFormatSupported: async ({ format }) => true,
      isModuleExtensionSupported: async ({ extension }) => {
        return ['Fizz', 'Foo'].includes(extension)
      },
      logger
    })

    await loadModule({
      id: PROCESS,
      tags: [{ name: 'Module', value: 'foobar' }]
    }).toPromise()
      .then(() => assert.fail('unreachable. Should have thrown'))
      .catch(err => assert.deepStrictEqual(err, {
        status: 422,
        message: 'Module Extensions for module "foobar" are not supported'
      }))
  })

  describe('Compute-Limit', () => {
    test('throw if not found', async () => {
      const loadModule = loadModuleWith({
        loadTransactionMeta: async () => ({
          owner: moduleOwner,
          tags: remove(5, 1, moduleTags)
        }),
        findModule: async () => { throw { status: 404 } },
        saveModule: async () => 'foobar',
        isModuleMemoryLimitSupported: async () => true,
        isModuleComputeLimitSupported: async () => true,
        isModuleFormatSupported: async () => true,
        isModuleExtensionSupported: async ({ extension }) => true,
        logger
      })

      await loadModule({
        id: PROCESS,
        tags: [{ name: 'Module', value: 'foobar' }]
      }).toPromise()
        .then(() => assert.fail('unreachable. Should have thrown'))
        .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Compute-Limit for process "${PROCESS}" exceeds supported limit` }))
    })

    test('throw if exceeds max allowed', async () => {
      const loadModule = loadModuleWith({
        loadTransactionMeta: async () => ({
          owner: moduleOwner,
          tags: moduleTags
        }),
        findModule: async () => { throw { status: 404 } },
        saveModule: async () => 'foobar',
        isModuleMemoryLimitSupported: async () => true,
        isModuleComputeLimitSupported: async () => false,
        isModuleFormatSupported: async () => true,
        isModuleExtensionSupported: async ({ extension }) => true,
        logger
      })

      await loadModule({
        id: PROCESS,
        tags: [{ name: 'Module', value: 'foobar' }]
      }).toPromise()
        .then(() => assert.fail('unreachable. Should have thrown'))
        .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Compute-Limit for process "${PROCESS}" exceeds supported limit` }))
    })
  })

  describe('Memory-Limit', () => {
    test('throw if is not found', async () => {
      const loadModule = loadModuleWith({
        loadTransactionMeta: async () => ({
          owner: moduleOwner,
          tags: remove(6, 1, moduleTags)
        }),
        findModule: async () => { throw { status: 404 } },
        saveModule: async () => 'foobar',
        isModuleMemoryLimitSupported: async () => true,
        isModuleComputeLimitSupported: async () => true,
        isModuleFormatSupported: async () => true,
        isModuleExtensionSupported: async ({ extension }) => true,
        logger
      })

      await loadModule({
        id: PROCESS,
        tags: [{ name: 'Module', value: 'foobar' }]
      }).toPromise()
        .then(() => assert.fail('unreachable. Should have thrown'))
        .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Memory-Limit for process "${PROCESS}" exceeds supported limit` }))
    })

    test('throw if exceeds max allowed', async () => {
      const loadModule = loadModuleWith({
        loadTransactionMeta: async () => ({
          owner: moduleOwner,
          tags: moduleTags
        }),
        findModule: async () => { throw { status: 404 } },
        saveModule: async () => 'foobar',
        isModuleMemoryLimitSupported: async () => false,
        isModuleComputeLimitSupported: async () => true,
        isModuleFormatSupported: async () => true,
        isModuleExtensionSupported: async ({ extension }) => true,
        logger
      })

      await loadModule({
        id: PROCESS,
        tags: [{ name: 'Module', value: 'foobar' }]
      }).toPromise()
        .then(() => assert.fail('unreachable. Should have thrown'))
        .catch(err => assert.deepStrictEqual(err, { status: 413, message: `Memory-Limit for process "${PROCESS}" exceeds supported limit` }))
    })
  })
})
