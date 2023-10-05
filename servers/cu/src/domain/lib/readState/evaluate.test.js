import { describe, test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

import { createLogger } from '../../logger.js'
import { evaluateWith } from './evaluate.js'

const logger = createLogger('ao-cu:readState')

describe('evaluate', () => {
  describe('output - ACCUMULATE_RESULT', () => {
    const evaluate = evaluateWith({
      ACCUMULATE_RESULT: true,
      saveEvaluation: async (interaction) => interaction,
      logger
    })

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/contracts/happy/contract.wasm'),
      state: {},
      actions: [
        {
          action: { input: { function: 'hello' } },
          sortKey: 'a',
          SWGlobal: {}
        },
        {
          action: { input: { function: 'world' } },
          sortKey: 'b',
          SWGlobal: {}
        }
      ]
    }

    test('adds output to context', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.ok(output)
    })

    test('folds the state', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.state, { heardHello: true, heardWorld: true, happy: true })
    })

    test('accumulates the result.messages', async () => {
      const expectedMessage = {
        target: 'contract-foo-123',
        input: { function: 'noop' },
        tags: [
          { name: 'foo', value: 'bar' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.messages, [expectedMessage, expectedMessage])
    })

    test('accumulates the result.spawns', async () => {
      const expectedSpawn = {
        src: 'contract-src-123',
        initState: { balances: { foo: 0 } },
        tags: [
          { name: 'foo', value: 'bar' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.spawns, [expectedSpawn, expectedSpawn])
    })

    test('accumulates the result.output', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.output, 'foobar\nfoobar\n')
    })
  })

  describe('output - NOT ACCUMULATE_RESULT', () => {
    const evaluate = evaluateWith({
      /**
       * disable accumulation of the result
       */
      ACCUMULATE_RESULT: false,
      saveEvaluation: async (interaction) => interaction,
      logger
    })

    const ctx = {
      id: 'ctr-1234',
      from: 'sort-key-start',
      src: readFileSync('./test/contracts/happy/contract.wasm'),
      state: {},
      actions: [
        {
          action: { input: { function: 'hello' } },
          sortKey: 'a',
          SWGlobal: {}
        },
        {
          action: { input: { function: 'world' } },
          sortKey: 'b',
          SWGlobal: {}
        }
      ]
    }

    test('adds output to context', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.ok(output)
    })

    test('folds the state', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.state, { heardHello: true, heardWorld: true, happy: true })
    })

    test('DOES NOT accumulate the result.messages', async () => {
      const expectedMessage = {
        target: 'contract-foo-123',
        input: { function: 'noop' },
        tags: [
          { name: 'foo', value: 'bar' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.messages, [expectedMessage])
    })

    test('DOES NOT accumulate the result.spawns', async () => {
      const expectedSpawn = {
        src: 'contract-src-123',
        initState: { balances: { foo: 0 } },
        tags: [
          { name: 'foo', value: 'bar' }
        ]
      }
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.spawns, [expectedSpawn])
    })

    test('DOES NOT accumulates the result.output', async () => {
      const { output } = await evaluate(ctx).toPromise()
      assert.deepStrictEqual(output.result.output, 'foobar')
    })
  })

  test('save each interaction', async () => {
    let cacheCount = 0
    const env = {
      saveEvaluation: async (interaction) => {
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
      actions: [
        {
          action: { input: { function: 'hello' } },
          sortKey: 'a',
          SWGlobal: {}
        },
        {
          action: { input: { function: 'world' } },
          sortKey: 'b',
          SWGlobal: {}
        },
        {
          action: { input: { function: 'hello' } },
          sortKey: 'c',
          SWGlobal: {}
        },
        {
          action: { input: { function: 'world' } },
          sortKey: 'd',
          SWGlobal: {}
        },
        {
          action: { input: { function: 'hello' } },
          sortKey: 'e',
          SWGlobal: {}
        }
      ]
    }

    await evaluate(ctx).toPromise()
    assert.equal(cacheCount, 5)
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
      actions: []
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
      state: {},
      actions: [
        {
          // Will include an error in result.error
          action: { input: { function: 'errorResult' } },
          sortKey: 'a',
          SWGlobal: {}
        }
      ]
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      state: {},
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
      state: {},
      actions: [
        {
          // Will intentionally throw from the lua contract
          action: { input: { function: 'errorThrow' } },
          sortKey: 'a',
          SWGlobal: {}
        }
      ]
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.deepStrictEqual(res.output, {
      state: {},
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
      state: {},
      actions: [
        {
          // Will unintentionally throw from the lua contract
          action: { input: { function: 'errorUnhandled' } },
          sortKey: 'a',
          SWGlobal: {}
        }
      ]
    }

    const res = await evaluate(ctx).toPromise()
    console.log(res.output)
    assert.ok(res.output)
    assert.ok(res.output.result.error)
  })
})
