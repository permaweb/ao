/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

import AoLoader from '@permaweb/ao-loader'

import { findModuleSchema, saveModuleSchema } from '../dal.js'
import {
  evaluatorWith,
  findModuleWith,
  saveModuleWith
} from './ao-module.js'
import { createLogger } from '../logger.js'
import { MODULES_TABLE } from './sqlite.js'

const logger = createLogger('ao-cu:readState')

describe('ao-module', () => {
  describe('findModule', () => {
    test('find the module', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          db: {
            query: async () => [{
              id: 'mod-123',
              tags: JSON.stringify([{ name: 'foo', value: 'bar' }]),
              owner: JSON.stringify({ address: 'owner-123', key: 'key-123' })
            }]
          },
          logger
        })
      )

      const res = await findModule({ moduleId: 'mod-123' })
      assert.deepStrictEqual(res, {
        id: 'mod-123',
        tags: [{ name: 'foo', value: 'bar' }],
        owner: { address: 'owner-123', key: 'key-123' }
      })
    })

    test('return 404 status if not found', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          db: {
            query: async () => undefined
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

    test('passively delete record and return 404 status if record has invalid owner', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          db: {
            query: async () => [{
              id: 'mod-123',
              tags: JSON.stringify([{ name: 'foo', value: 'bar' }]),
              owner: 'owner-123'
            }],
            run: async ({ sql, parameters }) => {
              assert.ok(sql.trim().startsWith(`DELETE FROM ${MODULES_TABLE}`))
              assert.deepStrictEqual(parameters, ['mod-123'])
            }
          },
          logger
        })
      )

      const res = await findModule({ moduleId: 'mod-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          assert.equal(err.message, 'Module record invalid')
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findModule = findModuleSchema.implement(
        findModuleWith({
          db: {
            query: async () => { throw { status: 500 } }
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
          db: {
            run: async ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
                'mod-123',
                JSON.stringify([
                  { name: 'Module-Format', value: 'wasm32-unknown-emscripten' }
                ]),
                JSON.stringify({ address: 'owner-123', key: 'key-123' })
              ])
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
        ],
        owner: { address: 'owner-123', key: 'key-123' }
      })
    })

    test('noop if the module already exists', async () => {
      const saveModule = saveModuleSchema.implement(
        saveModuleWith({
          db: {
            run: async ({ sql }) => {
              assert.ok(sql.trim().startsWith('INSERT OR IGNORE'))
            }
          },
          logger
        })
      )

      await saveModule({
        id: 'mod-123',
        tags: [
          { name: 'Module-Format', value: 'wasm32-unknown-emscripten' }
        ],
        owner: { address: 'owner-123', key: 'key-123' }
      })
    })
  })

  describe('evaluateWith', () => {
    const moduleId = 'foo-module'
    const moduleOptions = {
      format: 'wasm32-unknown-emscripten',
      inputEncoding: 'JSON-1',
      outputEncoding: 'JSON-1',
      memoryLimit: 524_288_000, // in bytes
      computeLimit: 9_000_000_000_000,
      extensions: []
    }
    const args = {
      name: 'foobar Message',
      noSave: false,
      deepHash: undefined,
      cron: undefined,
      ordinate: '1',
      isAssignment: false,
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

    test('should eval the message', async () => {
      const evaluator = evaluatorWith({
        loadWasmModule: async () => WebAssembly.compile(readFileSync('./test/processes/happy/process.wasm')),
        evaluate: ({ streamId, wasmModule, moduleId: mId, moduleOptions: mOptions, Memory, message, AoGlobal, ...rest }) => {
          assert.ok(streamId)
          assert.ok(wasmModule)
          assert.equal(mId, moduleId)
          assert.deepStrictEqual(mOptions, moduleOptions)

          assert.deepStrictEqual(rest, {
            name: 'foobar Message',
            noSave: false,
            deepHash: undefined,
            cron: undefined,
            ordinate: '1',
            isAssignment: false,
            processId: 'foobar-process'
          })

          return AoLoader(readFileSync('./test/processes/happy/process.wasm'), mOptions)
            .then((wasmModule) => wasmModule(Memory, message, AoGlobal))
        },
        logger
      })

      const res = await (await evaluator({ moduleId, moduleOptions }))(args)

      assert.ok(res.Memory)
      assert.ok(res.Output)
      assert.ok(res.Messages)
      assert.ok(res.Spawns)
      assert.ok(res.GasUsed)
    })
  })
})
