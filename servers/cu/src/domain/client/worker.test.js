/* eslint-disable no-throw-literal */
import { describe, test, before, beforeEach } from 'node:test'
import assert from 'node:assert'
import { createReadStream } from 'node:fs'

import { LRUCache } from 'lru-cache'
import AoLoader from '@permaweb/ao-loader'

import { createLogger } from '../logger.js'

const logger = createLogger('ao-cu:worker')

describe('worker', async () => {
  process.env.NO_WORKER = '1'

  const moduleOptions = {
    format: 'wasm32-unknown-emscripten',
    inputEncoding: 'JSON-1',
    outputEncoding: 'JSON-1',
    memoryLimit: 524_288_000, // in bytes
    computeLimit: 9_000_000_000_000,
    extensions: []
  }

  describe('evaluateWith', async () => {
    describe('output', async () => {
      let evaluate
      const wasmInstanceCache = new LRUCache({ max: 1 })
      before(async () => {
        evaluate = (await import('./worker.js')).evaluateWith({
          saveEvaluation: async (evaluation) => evaluation,
          wasmInstanceCache,
          wasmModuleCache: new LRUCache({ max: 1 }),
          readWasmFile: async () => createReadStream('./test/processes/happy/process.wasm'),
          writeWasmFile: async () => true,
          streamTransactionData: async () => assert.fail('should not call if readWasmFile'),
          bootstrapWasmInstance: (wasmModule, _moduleOptions) => {
            assert.deepStrictEqual(_moduleOptions, moduleOptions)
            return AoLoader(
              (info, receiveInstance) => WebAssembly.instantiate(wasmModule, info).then(receiveInstance),
              _moduleOptions
            )
          },
          logger
        })
      })

      beforeEach(() => wasmInstanceCache.clear())

      const args = {
        streamId: 'stream-123',
        moduleId: 'module-123',
        moduleOptions,
        processId: 'process-123',
        noSave: false,
        name: 'message 123',
        deepHash: undefined,
        cron: undefined,
        ordinate: '1',
        isAssignment: false,
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

      test('returns Memory', async () => {
        const output = await evaluate(args)
        assert.ok(output.Memory)
      })

      test('returns messages', async () => {
        const expectedMessage = {
          Target: 'process-foo-123',
          Tags: [
            { name: 'foo', value: 'bar' },
            { name: 'function', value: 'noop' }
          ]
        }
        const output = await evaluate(args)
        assert.deepStrictEqual(output.Messages, [expectedMessage])
      })

      test('returns assignments', async () => {
        const output = await evaluate(args)
        assert.deepStrictEqual(output.Assignments, [])
      })

      test('returns spawns', async () => {
        const expectedSpawn = {
          Owner: 'owner-123',
          Tags: [
            { name: 'foo', value: 'bar' },
            { name: 'balances', value: '{"myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc": 1000 }' }
          ]
        }
        const output = await evaluate(args)
        assert.deepStrictEqual(output.Spawns, [expectedSpawn])
      })

      test('returns output', async () => {
        const output = await evaluate(args)
        assert.deepEqual(JSON.parse(output.Output), {
          heardHello: true,
          lastMessage: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-123',
            Tags: [
              { name: 'function', value: 'hello' }
            ],
            'Block-Height': 1234,
            function: 'hello'
          }
        })
      })

      test('folds state across multiple invocations', async () => {
        await evaluate(args)
        const output = await evaluate({
          ...args,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          }
        })

        /**
         * Assert the memory of the internal process state is returned
         */
        assert.ok(output.Memory)
        assert.deepEqual(
          /**
           * Our process used in the unit tests serializes the state being mutated
           * by the process, so we can parse it here and run assertions
           */
          JSON.parse(output.Output),
          {
            heardHello: true,
            heardWorld: true,
            happy: true,
            lastMessage: {
              Id: 'message-123',
              Timestamp: 1702846520559,
              Owner: 'owner-456',
              Tags: [
                { name: 'function', value: 'world' }
              ],
              'Block-Height': 1235,
              function: 'world'
            }
          }
        )
      })
    })

    describe('save the evaluation', () => {
      const deps = {
        saveEvaluation: async (evaluation) => evaluation,
        wasmInstanceCache: new LRUCache({ max: 1 }),
        wasmModuleCache: new LRUCache({ max: 1 }),
        readWasmFile: async () => createReadStream('./test/processes/sad/process.wasm'),
        writeWasmFile: async () => true,
        streamTransactionData: async () => assert.fail('should not call if readWasmFile'),
        bootstrapWasmInstance: (wasmModule, _moduleOptions) => {
          assert.deepStrictEqual(_moduleOptions, moduleOptions)
          return AoLoader(
            (info, receiveInstance) => WebAssembly.instantiate(wasmModule, info).then(receiveInstance),
            _moduleOptions
          )
        },
        logger
      }

      const args = {
        streamId: 'stream-123',
        moduleId: 'module-123',
        moduleOptions,
        processId: 'process-123',
        noSave: false,
        name: 'message 123',
        deepHash: undefined,
        cron: undefined,
        ordinate: '1',
        isAssignment: false,
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

      test('if noSave is falsey', async () => {
        let called = false
        const evaluate = (await import('./worker.js')).evaluateWith({
          ...deps,
          saveEvaluation: () => { called = true }
        })

        await evaluate(args)
        assert.ok(called)
      })

      test('noop if noSave is true', async () => {
        let called = false
        const evaluate = (await import('./worker.js')).evaluateWith({
          ...deps,
          saveEvaluation: () => { called = true }
        })

        await evaluate({ ...args, noSave: true })
        assert.ok(!called)
      })
    })

    describe('errors', async () => {
      let evaluate
      before(async () => {
        evaluate = (await import('./worker.js')).evaluateWith({
          saveEvaluation: async (evaluation) => evaluation,
          wasmInstanceCache: new LRUCache({ max: 1 }),
          wasmModuleCache: new LRUCache({ max: 1 }),
          readWasmFile: async () => createReadStream('./test/processes/sad/process.wasm'),
          writeWasmFile: async () => true,
          streamTransactionData: async () => assert.fail('should not call if readWasmFile'),
          bootstrapWasmInstance: (wasmModule, _moduleOptions) => {
            assert.deepStrictEqual(_moduleOptions, moduleOptions)
            return AoLoader(
              (info, receiveInstance) => WebAssembly.instantiate(wasmModule, info).then(receiveInstance),
              _moduleOptions
            )
          },
          logger
        })
      })

      const args = {
        streamId: 'stream-123',
        moduleId: 'module-123',
        moduleOptions,
        name: 'message 123',
        processId: 'process-123',
        Memory: Buffer.from('Hello', 'utf-8'),
        // Will add message in each test case
        AoGlobal: {
          Process: {
            Id: '1234',
            Tags: []
          }
        }
      }

      test('error returned in process result and uses previous Memory', async () => {
        const output = await evaluate({
          ...args,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorResult' }
            ],
            'Block-Height': 1234
          }
        })

        /**
         * When an error occurs in eval, its output Memory is ignored
         * and the output Memory from the previous eval is used.
         *
         * So we assert that the original Memory that was passed in is returned
         * from eval
         */
        assert.deepStrictEqual(output.Memory, Buffer.from('Hello', 'utf-8'))
        assert.deepStrictEqual(output.Error, { code: 123, message: 'a handled error within the process' })
      })

      test('error thrown by process and uses previous Memory', async () => {
        const output = await evaluate({
          ...args,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorThrow' }
            ],
            'Block-Height': 1234
          }
        })

        assert.deepStrictEqual(output.Memory, Buffer.from('Hello', 'utf-8'))
        assert.deepStrictEqual(output.Error, { code: 123, message: 'a thrown error within the process' })
      })

      test('error unhandled by process and uses previous Memory', async () => {
        const output = await evaluate({
          ...args,
          // Will unintentionally throw from the lua
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorUnhandled' }
            ],
            'Block-Height': 1234
          }
        })

        assert.ok(output.Error)
        assert(output.Error.endsWith("attempt to index a nil value (field 'field')"))
        assert.deepStrictEqual(output.Memory, Buffer.from('Hello', 'utf-8'))
      })
    })
  })
})
