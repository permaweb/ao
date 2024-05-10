/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

import AoLoader from '@permaweb/ao-loader'

import { createLogger } from '../logger.js'
import { evaluateWith } from './evaluate.js'

const logger = createLogger('ao-cu:readState')

async function * toAsyncIterable (iterable) {
  while (iterable.length) yield iterable.shift()
}

const moduleOptions = {
  format: 'wasm32-unknown-emscripten',
  inputEncoding: 'JSON-1',
  outputEncoding: 'JSON-1',
  memoryLimit: 524_288_000, // in bytes
  computeLimit: 9_000_000_000_000,
  extensions: []
}
const happyWasm = await AoLoader(readFileSync('./test/processes/happy/process.wasm'), moduleOptions)
const sadWasm = await AoLoader(readFileSync('./test/processes/sad/process.wasm'), moduleOptions)
async function evaluateHappyMessage ({ moduleId, moduleOptions: mOptions }) {
  assert.equal(moduleId, 'foo-module')
  assert.deepStrictEqual(mOptions, moduleOptions)
  return ({ Memory, message, AoGlobal }) => happyWasm(Memory, message, AoGlobal)
}

async function evaluateSadMessage ({ moduleId }) {
  assert.equal(moduleId, 'foo-module')
  return ({ Memory, message, AoGlobal }) => sadWasm(Memory, message, AoGlobal)
}

describe('evaluate', () => {
  test('adds output and last to context', async () => {
    const evaluate = evaluateWith({
      findMessageBefore: async () => { throw { status: 404 } },
      loadEvaluator: evaluateHappyMessage,
      saveLatestProcessMemory: async () => {},
      logger
    })

    const { output, last } = await evaluate({
      id: 'ctr-1234',
      from: new Date().getTime(),
      moduleId: 'foo-module',
      moduleOptions,
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        Memory: null
      },
      messages: toAsyncIterable([
        {
          ordinate: 1,
          isAssignment: false,
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
        },
        {
          ordinate: 1,
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        }
      ])
    }).toPromise()

    assert.ok(output)
    assert.ok(output.Memory)
    assert.ok(output.Messages)
    assert.ok(output.Spawns)
    assert.ok(output.Output)

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

    assert.ok(last)
    assert.ok(last.timestamp)
    assert.ok(last.blockHeight)
    assert.ok(last.ordinate)
  })

  test('skip over dupliate messages (dup assignment or dup push (deepHash))', async () => {
    let evalCount = 0
    let messageCount = 0
    const env = {
      findMessageBefore: async (args) => {
        // first message
        if (messageCount === 0) {
          assert.deepStrictEqual(args, {
            messageId: 'message-123',
            isAssignment: true,
            deepHash: undefined,
            processId: 'ctr-1234',
            epoch: 0,
            nonce: 1
          })
        }
        if (!messageCount) {
          messageCount++
          throw { status: 404 }
        }

        messageCount++
        return { id: 'evaluation-doc-123' }
      },
      loadEvaluator: async (...args) => {
        const e = await evaluateHappyMessage(...args)
        return (...opts) => {
          evalCount++
          return e(...opts)
        }
      },
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
      moduleOptions,
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        Memory: null
      },
      messages: toAsyncIterable([
        // assignment
        {
          ordinate: 1,
          isAssignment: true,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-123',
            Epoch: 0,
            Nonce: 1,
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
        },
        // deepHash
        {
          ordinate: 1,
          isAssignment: false,
          deepHash: 'deephash-123',
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Epoch: 0,
            Nonce: 1,
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        },
        // no deep hash or assignment
        {
          ordinate: 1,
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Epoch: 0,
            Nonce: 1,
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1236
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        }
      ])
    }

    await evaluate(ctx).toPromise()
    assert.equal(messageCount, 2)
    assert.equal(evalCount, 2)
  })

  test('skip over Cron Messages that are already evaluated', async () => {
    let evalCount = 0
    const env = {
      findMessageBefore: async () => { throw { status: 404 } },
      loadEvaluator: async (...args) => {
        const e = await evaluateHappyMessage(...args)
        return (...opts) => {
          evalCount++
          return e(...opts)
        }
      },
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      fromCron: '1-10-minutes',
      moduleId: 'foo-module',
      moduleOptions,
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        Memory: null
      },
      messages: toAsyncIterable([
        // duplicate of starting point
        {
          ordinate: 1,
          cron: '1-10-minutes',
          isAssignment: false,
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
        },
        {
          ordinate: 1,
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        },
        {
          ordinate: 2,
          cron: '1-20-minutes',
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520600,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1236
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        },
        // duplicate of previous
        {
          ordinate: 2,
          cron: '1-20-minutes',
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520600,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1236
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        },
        {
          ordinate: 3,
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520700,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        }
      ])
    }

    await evaluate(ctx).toPromise()
    assert.equal(evalCount, 3)
  })

  test('continue evaluating, ignoring output of errored message', async () => {
    // eslint-disable-next-line
    let evalCount = 0
    const env = {
      findMessageBefore: async () => { throw { status: 404 } },
      loadEvaluator: async (...args) => {
        const e = await evaluateSadMessage(...args)
        return (...opts) => {
          evalCount++
          return e(...opts)
        }
      },
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
      moduleOptions,
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        Memory: null
      },
      messages: toAsyncIterable([
        {
          // Will include an error in result.error
          ordinate: 1,
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'errorResult' }
            ],
            'Block-Height': 1234
          },
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        },
        {
          ordinate: 1,
          isAssignment: false,
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
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        },
        {
          ordinate: 1,
          isAssignment: false,
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
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
        }
      ])
    }

    const res = await evaluate(ctx).toPromise()
    assert.ok(res.output)
    assert.equal(res.output.Output, '2')
    // Only cache the evals that did not produce errors
    // TODO: check out why cache is not working
    // assert.equal(cacheCount, 2)
  })

  test('removes invalid tags', async () => {
    const evaluate = evaluateWith({
      findMessageBefore: async () => { throw { status: 404 } },
      loadEvaluator: () => ({ message }) => {
        assert.deepStrictEqual(
          message.Tags,
          [
            { name: 'function', value: 'hello' }
          ]
        )
      },
      saveLatestProcessMemory: async () => {},
      logger
    })

    await evaluate({
      id: 'ctr-1234',
      from: new Date().getTime(),
      moduleId: 'foo-module',
      moduleOptions,
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        Memory: null
      },
      messages: toAsyncIterable([
        {
          ordinate: 1,
          isAssignment: false,
          message: {
            Id: 'message-123',
            Timestamp: 1702846520559,
            Owner: 'owner-123',
            Tags: [
              { name: 'From', value: 'hello' },
              { name: 'function', value: 'hello' },
              { name: 'Owner', value: 'hello' }
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
      ])
    }).toPromise()
  })
})
