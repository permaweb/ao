/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { createReadStream, readFileSync } from 'node:fs'
import { Readable } from 'node:stream'

import AoLoader from '@permaweb/ao-loader'

import { findModuleSchema, saveModuleSchema } from '../dal.js'
import {
  evaluatorWith,
  findModuleWith,
  saveModuleWith
} from './ao-module.js'
import { createLogger } from '../logger.js'

const logger = createLogger('ao-cu:readState')

describe('ao-module', () => {
  describe('findModule', () => {
    test('find the module', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          pouchDb: {
            get: async () => ({
              _id: 'module-mod-123',
              moduleId: 'mod-123',
              tags: [{ name: 'foo', value: 'bar' }],
              type: 'module'
            })
          },
          logger
        })
      )

      const res = await findModule({ moduleId: 'mod-123' })
      assert.deepStrictEqual(res, {
        id: 'mod-123',
        tags: [{ name: 'foo', value: 'bar' }]
      })
    })

    test('return 404 status if not found', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          pouchDb: {
            get: async () => { throw { status: 404 } }
          },
          logger
        })
      )

      const res = await findModule({ moduleId: 'mod-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          pouchDb: {
            get: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findModule({ moduleId: 'mod-123' })
        .then(assert.fail)
        .catch(assert.ok)
    })
  })

  describe('saveModule', () => {
    test('save the module', async () => {
      const saveModule = saveModuleSchema.implement(
        saveModuleWith({
          pouchDb: {
            put: async (doc) => {
              const { _attachments, ...rest } = doc

              assert.deepStrictEqual(rest, {
                _id: 'module-mod-123',
                moduleId: 'mod-123',
                tags: [
                  { name: 'Module-Format', value: 'wasm32-unknown-emscripten' }
                ],
                type: 'module'
              })
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveModule({
        id: 'mod-123',
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' }
        ]
      })
    })

    test('noop if the module already exists', async () => {
      const saveModule = saveModuleSchema.implement(
        saveModuleWith({
          pouchDb: {
            put: async () => { throw { status: 409 } }
          },
          logger
        })
      )

      await saveModule({
        id: 'mod-123',
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' }
        ]
      })
    })
  })

  describe('evaluateWith', () => {
    // const cache = new LRUCache({ max: 1 })
    const moduleId = 'foo-module'
    const args = {
      Memory: null,
      message: {
        Id: 'message-123',
        Timestamp: 1702846520559,
        Owner: 'owner-123',
        Tags: [
          { name: 'function', value: 'hello' }
        ],
        'Block-Height': 1234
      },
      AoGlobal: {
        Process: {
          Id: '1234',
          Tags: []
        }
      }
    }

    // afterEach(() => cache.clear())

    // test('should eval the message using the cached Module wasm', async () => {
    //   cache.set('foo-module', await AoLoader(readFileSync('./test/processes/happy/process.wasm')))

    //   const evaluator = evaluatorWith({
    //     cache: {
    //       get: (moduleId) => {
    //         assert.equal(moduleId, 'foo-module')
    //         return cache.get(moduleId)
    //       },
    //       set: () => assert.fail('Should not set in cache if found in cache')
    //     },
    //     loadTransactionData: () => assert.fail('should not loadTransactionData if cached'),
    //     bootstrapWasmModule: () => assert.fail('should not bootstrapWasmModule if cached'),
    //     readWasmFile: () => assert.fail('should not readWasmFile if cached'),
    //     writeWasmFile: () => assert.fail('should not writeWasmFile if cached'),
    //     logger
    //   })

    //   const res = await evaluator({ moduleId })(args)

    //   assert.ok(res.Memory)
    //   assert.ok(res.Output)
    //   assert.ok(res.Messages)
    //   assert.ok(res.Spawns)
    //   assert.ok(res.GasUsed)
    // })

    test('should eval the message using the cached raw wasm from a file', async () => {
      // cache.set('foo-module', await AoLoader(readFileSync('./test/processes/happy/process.wasm')))

      const evaluator = evaluatorWith({
        // cache: {
        //   get: (moduleId) => {
        //     assert.equal(moduleId, 'foo-module')
        //     return cache.get(moduleId)
        //   },
        //   set: () => assert.fail('Should not set in cache if found in cache')
        // },
        loadTransactionData: () => assert.fail('should not loadTransactionData if cached on filesystem'),
        bootstrapWasmModule: (wasm) => AoLoader(wasm),
        readWasmFile: async () => readFileSync('./test/processes/happy/process.wasm'),
        writeWasmFile: () => assert.fail('should not writeWasmFile if cached on filesystem'),
        logger
      })

      const res = (await evaluator({ moduleId }))(args)

      assert.ok(res.Memory)
      assert.ok(res.Output)
      assert.ok(res.Messages)
      assert.ok(res.Spawns)
      assert.ok(res.GasUsed)
    })

    test('should eval the message using the raw wasm fetched from arweave', async () => {
      const evaluator = evaluatorWith({
        // cache: {
        //   get: () => undefined,
        //   set: (moduleId, wasmModule) => {
        //     assert.equal(moduleId, 'foo-module')
        //     assert.ok(typeof wasmModule === 'function')
        //   }
        // },
        loadTransactionData: async (moduleId) => {
          assert.equal(moduleId, 'foo-module')
          return new Response(Readable.toWeb(createReadStream('./test/processes/happy/process.wasm')))
        },
        bootstrapWasmModule: async (wasm) => AoLoader(wasm),
        readWasmFile: async () => { throw new Error('not on filesystem') },
        writeWasmFile: async (moduleId, wasm) => {
          assert.equal(moduleId, 'foo-module')
          assert.ok(typeof wasm.pipe === 'function')
        },
        logger
      })

      const res = (await evaluator({ moduleId }))(args)

      assert.ok(res.Memory)
      assert.ok(res.Output)
      assert.ok(res.Messages)
      assert.ok(res.Spawns)
      assert.ok(res.GasUsed)
    })
  })
})
