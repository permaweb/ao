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
      logger
    })

    let ctx
    beforeEach(() => {
      ctx = {
        id: 'ctr-1234',
        from: 'sort-key-start',
        src: readFileSync('./test/processes/happy/process.wasm'),
        buffer: null,
        messages: toAsyncIterable([
          {
            message: {
              owner: 'owner-123',
              tags: [
                { name: 'function', value: 'hello' }
              ]
            },
            sortKey: 'a',
            AoGlobal: {}
          },
          {
            message: {
              owner: 'owner-456',
              tags: [
                { name: 'function', value: 'world' }
              ]
            },
            sortKey: 'b',
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
       * Assert the buffer of the internal process state is returned
       */
      assert.ok(output.buffer)
      assert.deepStrictEqual(
        /**
         * Our process used in the unit tests serializes the state being mutated
         * by the process, so we can parse it here and run assertions
         */
        JSON.parse(output.output),
        {
          heardHello: true,
          heardWorld: true,
          happy: true,
          lastMessage: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'world' }
            ]
          }
        }
      )
    })

    test('returns messages', async () => {
      const expectedMessage = {
        target: 'process-foo-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'function', value: 'noop' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.messages, [expectedMessage])
    })

    test('returns spawns', async () => {
      const expectedSpawn = {
        owner: 'owner-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'balances', value: '{"myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc": 1000 }' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.spawns, [expectedSpawn])
    })

    test('returns output', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(JSON.parse(output.output), {
        heardHello: true,
        heardWorld: true,
        happy: true,
        lastMessage: {
          owner: 'owner-456',
          tags: [
            { name: 'function', value: 'world' }
          ]
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
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/processes/happy/process.wasm'),
      buffer: null,
      messages: toAsyncIterable([
        {
          message: {
            owner: 'owner-123',
            tags: [
              { name: 'function', value: 'hello' }
            ]
          },
          sortKey: 'a',
          AoGlobal: {}
        },
        {
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'world' }
            ]
          },
          sortKey: 'b',
          AoGlobal: {}
        }
      ])
    }

    await evaluate(ctx).toPromise()
    assert.equal(cacheCount, 2)
  })

  test('noop the initial state', async () => {
    const env = {
      saveEvaluation: async (interaction) =>
        assert.fail('cache should not be interacted with on a noop of state'),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/processes/happy/process.wasm'),
      /**
       * In reality this would be an illegible byte array, since it's format
       * will be determined by whatever the underlying runtime is, in this case,
       * Lua
       */
      buffer: Buffer.from('Hello', 'utf-8'),
      result: {
        messages: [],
        output: '',
        spawns: []
      },
      messages: toAsyncIterable([])
    }

    const { output } = await evaluate(ctx).toPromise()
    assert.deepStrictEqual(output, {
      buffer: Buffer.from('Hello', 'utf-8'),
      messages: [],
      spawns: [],
      output: ''
    })
  })

  test('error returned in process result', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/processes/sad/process.wasm'),
      buffer: Buffer.from('Hello', 'utf-8'),
      messages: toAsyncIterable([
        {
          // Will include an error in error
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'errorResult' }
            ]
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      /**
       * When an error occurs in eval, its output buffer is ignored
       * and the output buffer from the previous eval is used.
       *
       * So we assert that the original buffer that was passed in is returned
       * from eval
       */
      buffer: Buffer.from('Hello', 'utf-8'),
      error: { code: 123, message: 'a handled error within the process' },
      messages: [],
      spawns: [],
      output: '0'
    })
  })

  test('error thrown by process', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/processes/sad/process.wasm'),
      buffer: Buffer.from('Hello', 'utf-8'),
      messages: toAsyncIterable([
        {
          // Will intentionally throw from the lua process
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'errorThrow' }
            ]
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      buffer: Buffer.from('Hello', 'utf-8'),
      error: { code: 123, message: 'a thrown error within the process' },
      messages: [],
      spawns: [],
      output: ''
    })
  })

  test('error unhandled by process', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/processes/sad/process.wasm'),
      buffer: Buffer.from('Hello', 'utf-8'),
      messages: toAsyncIterable([
        {
          // Will unintentionally throw from the lua contract
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'errorUnhandled' }
            ]
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.ok(res.output.error)
    assert.deepStrictEqual(res.buffer, Buffer.from('Hello', 'utf-8'))
  })

  test('continue evaluating, ignoring output of errored message', async () => {
    let cacheCount = 0
    const env = {
      saveEvaluation: async (evaluation) => {
        cacheCount++
        return undefined
      },
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/processes/sad/process.wasm'),
      buffer: null,
      messages: toAsyncIterable([
        {
          // Will include an error in result.error
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'errorResult' }
            ]
          },
          sortKey: 'a',
          AoGlobal: {}
        },
        {
          // Will increment a counter in global state
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'counter' }
            ]
          },
          sortKey: 'b',
          AoGlobal: {}
        },
        {
          // Will increment a counter in global state
          message: {
            owner: 'owner-456',
            tags: [
              { name: 'function', value: 'counter' }
            ]
          },
          sortKey: 'c',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.equal(JSON.parse(res.output.output), 2)
    // Only cache the evals that did not produce errors
    assert.equal(cacheCount, 2)
  })
})
