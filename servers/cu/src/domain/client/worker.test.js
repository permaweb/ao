/* eslint-disable no-throw-literal */
import { describe, test, before, beforeEach } from 'node:test'
import assert from 'node:assert'
import { createReadStream } from 'node:fs'

import { LRUCache } from 'lru-cache'
import AoLoader from '@permaweb/ao-loader'

import { createLogger } from '../logger.js'
import ms from 'ms'
import { uniqBy } from 'ramda'

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

  describe('cronMessagesBetween', async () => {
    /**
     * Timestamps the CU deals with will always be milliseconds, at the top of the SECOND
     *
     * SO in order for the test to be accurate, we truncate to floor second,
     * then convert back to milliseconds, so that we can compare on the second.
     */
    const nowSecond = Math.floor(new Date().getTime() / 1000) * 1000

    const originHeight = 125000
    const originTime = nowSecond - ms('30d')
    const mockCronMessage = {
      tags: [
        { name: 'Type', value: 'Message' },
        { name: 'function', value: 'notify' },
        { name: 'from', value: 'SIGNERS_WALLET_ADRESS' },
        { name: 'qty', value: '1000' }
      ]
    }

    const processId = 'process-123'
    const owner = 'owner-123'
    const originBlock = {
      height: originHeight,
      timestamp: originTime
    }
    const crons = [
      {
        interval: '10-minutes',
        unit: 'seconds',
        value: ms('10m') / 1000,
        message: mockCronMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockCronMessage
      },
      {
        interval: '15-minutes',
        unit: 'seconds',
        value: ms('15m') / 1000,
        message: mockCronMessage
      },
      {
        interval: '2-blocks',
        unit: 'blocks',
        value: 2,
        message: mockCronMessage
      }
    ]

    /**
     * blockRange of 5 blocks and 85 minutes
     *
     * Should produce 15 cron messages,
     * for a total of 17 including the actual messages
     */
    const scheduledMessagesStartTime = originTime + ms('20m')
    const blocksMeta = [
      // {
      //   height: originHeight + 10,
      //   timestamp: scheduledMessagesStartTime - ms('10m') - ms('10m') // 15m
      // },
      // {
      //   height: originHeight + 11,
      //   timestamp: scheduledMessagesStartTime - ms('10m') // 25m
      // },
      // The first scheduled message is on this block
      {
        height: originHeight + 12,
        timestamp: scheduledMessagesStartTime + ms('15m') // 35m
      },
      /**
       * 2 block-based:
       * - 2 @ root
       *
       * 3 time-based:
       * - 0 @ 35m
       * - 1 10_minute @ 40m
       * - 1 15_minute @ 45m
       * - 1 10_minute @ 50m
       */
      {
        height: originHeight + 13,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') // 51m
      },
      /**
       * 0 block-based
       *
       * 4 time-based:
       * - 0 @ 51m
       * - 1 10_minute @ 60m
       * - 1 15_minute @ 60m
       * - 1 10_minute @ 70m
       * - 1 15_minute @ 75m
       */
      {
        height: originHeight + 14,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') + ms('29m') // 80m
      },
      /**
       * 2 block-based
       * - 2 @ root
       *
       * 3 time-based:
       * - 1 10_minute @ 80m
       * - 1 15_minute @ 90m
       * - 1 10_minute @ 90m
       */
      {
        height: originHeight + 15,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') + ms('29m') + ms('15m') // 95m
      },
      /**
       * 0 block-based
       *
       * 1 time-based:
       * - 0 @ 95m
       * - 1 10_minute @ 100m
       */
      {
        height: originHeight + 16,
        timestamp: scheduledMessagesStartTime + ms('15m') + ms('16m') + ms('29m') + ms('15m') + ms('10m') // 105m
      }
      /**
       * NOT SCHEDULED BECAUSE OUTSIDE BLOCK RANGE
       * 2 block-based:
       * - 2 @ root
       *
       * X time-based:
       * - 1 15_minute @ 105m
       * ....
       */
    ]

    const cronMessages = []
    const cronMessagesBetween = (await import('./worker.js')).generateCronMessagesBetweenWith({
      workerpool: {
        workerEmit: (msg) => {
          cronMessages.push(msg)
        }
      }
    })
    const genCronMessages = cronMessagesBetween({
      logger,
      processId,
      owner,
      originBlock,
      crons,
      blocksMeta,
      left: {
        block: {
          height: originHeight + 11,
          timestamp: scheduledMessagesStartTime
        },
        ordinate: 1
      },
      right: {
        block: {
          height: originHeight + 16,
          timestamp: scheduledMessagesStartTime + ms('16m') + ms('29m') + ms('15m') + ms('10m')
        }
      }
    })

    before(genCronMessages)

    test('should create cron message according to the crons', async () => {
      // Two actual messages + 15 cron messages between them
      assert.equal(cronMessages.length + 2, 17)
    })

    test('should create a unique cron identifier for each generated message', async () => {
      assert.equal(
        cronMessages.length,
        uniqBy((node) => `${node.message.Timestamp},${node.ordinate},${node.cron}`, cronMessages).length
      )
    })
  })
})
