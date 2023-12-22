/* eslint-disable no-throw-literal */
import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

import { createLogger } from '../logger.js'
import { evaluateWith } from './evaluate.js'

const logger = createLogger('ao-cu:readState')

async function * toAsyncIterable (iterable) {
  while (iterable.length) yield iterable.shift()
}

describe('evaluate', () => {
  describe('output', () => {
    const evaluate = evaluateWith({
      saveEvaluation: async (evaluation) => evaluation,
      findMessageHash: async () => { throw { status: 404 } },
      logger
    })

    let ctx
    beforeEach(() => {
      ctx = {
        id: 'ctr-1234',
        from: new Date().getTime(),
        module: readFileSync('./test/processes/happy/process.wasm'),
        Memory: null,
        messages: toAsyncIterable([
          {
            ordinate: 1,
            message: {
              Id: 'message-123',
              Timestamp: 1702846520559,
              Owner: 'owner-123',
              Tags: [
                { name: 'function', value: 'hello' }
              ],
              'Block-Height': 1234
            },
            AoGlobal: {}
          },
          {
            ordinate: 1,
            message: {
              Id: 'message-123',
              Timestamp: 1702846520559,
              Owner: 'owner-456',
              Tags: [
                { name: 'function', value: 'world' }
              ],
              'Block-Height': 1235
            },
            AoGlobal: {}
          }
        ])
      }
    })

    test('adds output to context', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.ok(output)
    })

    /**
     * TODO: how to assert eval?
     */
    test('folds the state', async () => {
      const { output } = await evaluate(ctx).toPromise()
      /**
       * Assert the memory of the internal process state is returned
       */
      assert.ok(output.Memory)
      assert.deepStrictEqual(
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
            'Block-Height': 1235
          }
        }
      )
    })

    test('returns messages', async () => {
      const expectedMessage = {
        Target: 'process-foo-123',
        Tags: [
          { name: 'foo', value: 'bar' },
          { name: 'function', value: 'noop' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.Messages, [expectedMessage])
    })

    test('returns spawns', async () => {
      const expectedSpawn = {
        Owner: 'owner-123',
        Tags: [
          { name: 'foo', value: 'bar' },
          { name: 'balances', value: '{"myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc": 1000 }' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.Spawns, [expectedSpawn])
    })

    test('returns output', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(JSON.parse(output.Output), {
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
          'Block-Height': 1235
        }
      })
    })
  })

  test('save each interaction', async () => {
    let cacheCount = 0
    const env = {
      saveEvaluation: async (evaluation) => {
        cacheCount++
        return undefined
      },
      findMessageHash: async () => { throw { status: 404 } },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      module: readFileSync('./test/processes/happy/process.wasm'),
      Memory: null,
      messages: toAsyncIterable([
        {
          ordinate: 1,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-123',
            Tags: [
              { name: 'function', value: 'hello' }
            ],
            'Block-Height': 1234
          },
          AoGlobal: {}
        },
        {
          ordinate: 1,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          AoGlobal: {}
        }
      ])
    }

    await evaluate(ctx).toPromise()
    assert.equal(cacheCount, 2)
  })

  test('skip over messages that are already evaluated', async () => {
    let cacheCount = 0
    let messageHash = 0
    const env = {
      saveEvaluation: async (evaluation) => {
        cacheCount++
        return undefined
      },
      findMessageHash: async () => {
        if (!messageHash) {
          messageHash++
          throw { status: 404 }
        }

        messageHash++
        return { _id: 'messageHash-doc-123' }
      },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      module: readFileSync('./test/processes/happy/process.wasm'),
      Memory: null,
      messages: toAsyncIterable([
        {
          ordinate: 1,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-123',
            Tags: [
              { name: 'function', value: 'hello' }
            ],
            'Block-Height': 1234
          },
          deepHash: 'deephash-123',
          AoGlobal: {}
        },
        {
          ordinate: 1,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          deepHash: 'deephash-456',
          AoGlobal: {}
        },
        // no deep hash
        {
          ordinate: 1,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1236
          },
          AoGlobal: {}
        }
      ])
    }

    await evaluate(ctx).toPromise()
    assert.equal(messageHash, 2)
    assert.equal(cacheCount, 2)
  })

  test('noop the initial state', async () => {
    const env = {
      saveEvaluation: async (interaction) =>
        assert.fail('cache should not be interacted with on a noop of state'),
      findMessageHash: async () =>
        assert.fail('cache should not be interacted with on a noop of state'),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: new Date().getTime(),
      module: readFileSync('./test/processes/happy/process.wasm'),
      /**
       * In reality this would be an illegible byte array, since it's format
       * will be determined by whatever the underlying runtime is, in this case,
       * Lua
       */
      Memory: Buffer.from('Hello', 'utf-8'),
      result: {
        Messages: [],
        Output: '',
        Spawns: []
      },
      messages: toAsyncIterable([])
    }

    const { output } = await evaluate(ctx).toPromise()
    assert.deepStrictEqual(output, {
      Memory: Buffer.from('Hello', 'utf-8'),
      Messages: [],
      Spawns: [],
      Output: ''
    })
  })

  test('error returned in process result', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      findMessageHash: async () => { throw { status: 404 } },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      module: readFileSync('./test/processes/sad/process.wasm'),
      Memory: Buffer.from('Hello', 'utf-8'),
      messages: toAsyncIterable([
        {
          ordinate: 1,
          // Will include an error in error
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorResult' }
            ],
            'Block-Height': 1234
          },
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      /**
       * When an error occurs in eval, its output Memory is ignored
       * and the output Memory from the previous eval is used.
       *
       * So we assert that the original Memory that was passed in is returned
       * from eval
       */
      Memory: Buffer.from('Hello', 'utf-8'),
      Error: { code: 123, message: 'a handled error within the process' },
      Messages: [],
      Spawns: [],
      Output: '0'
    })
  })

  test('error thrown by process', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      findMessageHash: async () => { throw { status: 404 } },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      module: readFileSync('./test/processes/sad/process.wasm'),
      Memory: Buffer.from('Hello', 'utf-8'),
      messages: toAsyncIterable([
        {
          ordinate: 1,
          // Will intentionally throw from the lua process
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorThrow' }
            ],
            'Block-Height': 1234
          },
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      Memory: Buffer.from('Hello', 'utf-8'),
      Error: { code: 123, message: 'a thrown error within the process' },
      Messages: [],
      Spawns: [],
      Output: ''
    })
  })

  test('error unhandled by process', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      findMessageHash: async () => { throw { status: 404 } },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      module: readFileSync('./test/processes/sad/process.wasm'),
      Memory: Buffer.from('Hello', 'utf-8'),
      messages: toAsyncIterable([
        {
          ordinate: 1,
          // Will unintentionally throw from the lua contract
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorUnhandled' }
            ],
            'Block-Height': 1234
          },
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.ok(res.output.Error)
    assert.deepStrictEqual(res.Memory, Buffer.from('Hello', 'utf-8'))
  })

  test('continue evaluating, ignoring output of errored message', async () => {
    let cacheCount = 0
    const env = {
      saveEvaluation: async (evaluation) => {
        cacheCount++
        return undefined
      },
      findMessageHash: async () => { throw { status: 404 } },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      module: readFileSync('./test/processes/sad/process.wasm'),
      Memory: null,
      messages: toAsyncIterable([
        {
          // Will include an error in result.error
          ordinate: 1,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorResult' }
            ],
            'Block-Height': 1234
          },
          AoGlobal: {}
        },
        {
          ordinate: 1,
          // Will increment a counter in global state
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'counter' }
            ],
            'Block-Height': 1235
          },
          AoGlobal: {}
        },
        {
          ordinate: 1,
          // Will increment a counter in global state
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'counter' }
            ],
            'Block-Height': 1236
          },
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.equal(JSON.parse(res.output.Output), 2)
    // Only cache the evals that did not produce errors
    assert.equal(cacheCount, 2)
  })
})
