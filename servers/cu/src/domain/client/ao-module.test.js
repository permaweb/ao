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
    const moduleId = 'foo-module'
    const args = {
      name: 'foobar Message',
      processId: 'foobar-process',
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

    test('should eval the message using the cached raw wasm from a file', async () => {
      const evaluator = evaluatorWith({
        evaluate: ({ streamId, moduleId: mId, limit, name, processId, Memory, message, AoGlobal }) => {
          assert.ok(streamId)
          assert.equal(mId, moduleId)
          assert.equal(limit, 9_000_000_000_000)
          assert.equal(name, args.name)
          assert.equal(processId, args.processId)

          return AoLoader(readFileSync('./test/processes/happy/process.wasm'))
            .then((wasmModule) => wasmModule(Memory, message, AoGlobal))
        },
        loadTransactionData: () => assert.fail('should not loadTransactionData if cached on filesystem'),
        wasmFileExists: async () => true,
        writeWasmFile: () => assert.fail('should not writeWasmFile if cached on filesystem'),
        logger
      })

      const res = await (await evaluator({ moduleId, limit: 9_000_000_000_000 }))(args)

      assert.ok(res.Memory)
      assert.ok(res.Output)
      assert.ok(res.Messages)
      assert.ok(res.Spawns)
      assert.ok(res.GasUsed)
    })

    test('should eval the message using the raw wasm fetched from arweave', async () => {
      const evaluator = evaluatorWith({
        evaluate: ({ streamId, moduleId: mId, limit, name, processId, Memory, message, AoGlobal }) => {
          assert.ok(streamId)
          assert.equal(mId, moduleId)
          assert.equal(limit, 9_000_000_000_000)
          assert.equal(name, args.name)
          assert.equal(processId, args.processId)

          return AoLoader(readFileSync('./test/processes/happy/process.wasm'))
            .then((wasmModule) => wasmModule(Memory, message, AoGlobal))
        },
        loadTransactionData: async (moduleId) => {
          assert.equal(moduleId, 'foo-module')
          return new Response(Readable.toWeb(createReadStream('./test/processes/happy/process.wasm')))
        },
        wasmFileExists: async () => { throw new Error('not on filesystem') },
        writeWasmFile: async (moduleId, wasm) => {
          assert.equal(moduleId, 'foo-module')
          assert.ok(typeof wasm.pipe === 'function')
        },
        logger
      })

      const res = await (await evaluator({ moduleId, limit: 9_000_000_000_000 }))(args)

      assert.ok(res.Memory)
      assert.ok(res.Output)
      assert.ok(res.Messages)
      assert.ok(res.Spawns)
      assert.ok(res.GasUsed)
    })
  })
})
