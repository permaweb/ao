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
        src: readFileSync('./test/contracts/happy/contract.wasm'),
        state: { foo: 'bar' },
        messages: toAsyncIterable([
          {
            message: {
              owner: 'owner-123',
              tags: {
                function: 'hello'
              }
            },
            sortKey: 'a',
            AoGlobal: {}
          },
          {
            message: {
              owner: 'owner-456',
              tags: {
                function: 'world'
              }
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

    test('folds the state', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(
        output.state,
        {
          foo: 'bar',
          heardHello: true,
          heardWorld: true,
          happy: true,
          lastMessage: {
            owner: 'owner-456',
            tags: {
              function: 'world'
            }
          }
        }
      )
    })

    test('returns result.messages', async () => {
      const expectedMessage = {
        target: 'process-foo-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'function', value: 'noop' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.messages, [expectedMessage])
    })

    test('returns result.spawns', async () => {
      const expectedSpawn = {
        owner: 'owner-123',
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'balances', value: '{"myOVEwyX7QKFaPkXo3Wlib-Q80MOf5xyjL9ZyvYSVYc": 1000 }' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.spawns, [expectedSpawn])
    })

    test('returns result.output', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.output, 'foobar')
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
      src: readFileSync('./test/contracts/happy/contract.wasm'),
      state: { balances: { 1: 1 } },
      messages: toAsyncIterable([
        {
          message: {
            owner: 'owner-123',
            tags: {
              function: 'hello'
            }
          },
          sortKey: 'a',
          AoGlobal: {}
        },
        {
          message: {
            owner: 'owner-456',
            tags: {
              function: 'world'
            }
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
      src: readFileSync('./test/contracts/happy/contract.wasm'),
      state: { balances: { 1: 1 } },
      messages: toAsyncIterable([])
    }

    const { output } = await evaluate(ctx).toPromise()
    assert.deepStrictEqual(output, {
      state: { balances: { 1: 1 } },
      result: {
        messages: [],
        spawns: [],
        output: ''
      }
    })
  })

  test('error returned in contract result', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/contracts/sad/contract.wasm'),
      state: { foo: 'bar' },
      messages: toAsyncIterable([
        {
          // Will include an error in result.error
          message: {
            owner: 'owner-456',
            tags: {
              function: 'errorResult'
            }
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    console.log(res)
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      state: { foo: 'bar' },
      result: {
        error: { code: 123, message: 'a handled error within the contract' },
        messages: [],
        spawns: [],
        output: ''
      }
    })
  })

  test('error thrown by contract', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/contracts/sad/contract.wasm'),
      state: { foo: 'bar' },
      messages: toAsyncIterable([
        {
          // Will intentionally throw from the lua contract
          message: {
            owner: 'owner-456',
            tags: {
              function: 'errorThrow'
            }
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      state: { foo: 'bar' },
      result: {
        error: { code: 123, message: 'a thrown error within the contract' },
        messages: [],
        spawns: [],
        output: ''
      }
    })
  })

  test('error unhandled by contract', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/contracts/sad/contract.wasm'),
      state: { foo: 'bar' },
      messages: toAsyncIterable([
        {
          // Will unintentionally throw from the lua contract
          message: {
            owner: 'owner-456',
            tags: {
              function: 'errorUnhandled'
            }
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    console.log(res.output)
    assert.ok(res.output)
    assert.ok(res.output.result.error)
    assert.deepStrictEqual(res.state, { foo: 'bar' })
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
      src: readFileSync('./test/contracts/sad/contract.wasm'),
      state: { counter: 1 },
      messages: toAsyncIterable([
        {
          // Will include an error in result.error
          message: {
            owner: 'owner-456',
            tags: {
              function: 'errorResult'
            }
          },
          sortKey: 'a',
          AoGlobal: {}
        },
        {
          // Will include an error in result.error
          message: {
            owner: 'owner-456',
            tags: {
              function: 'counter'
            }
          },
          sortKey: 'a',
          AoGlobal: {}
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      state: { counter: 2 },
      result: {
        error: undefined,
        messages: [],
        spawns: [],
        output: ''
      }
    })
    assert.equal(cacheCount, 1)
  })
})
