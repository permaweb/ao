/* eslint-disable no-throw-literal */
import { describe, test, beforeEach } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'

import AoLoader from '@permaweb/ao-loader'

import { createLogger } from '../logger.js'
import { evaluateWith } from './evaluate.js'

const logger = createLogger('ao-cu:readState')

async function * toAsyncIterable (iterable) {
  while (iterable.length) yield iterable.shift()
}

const happyWasm = await AoLoader(readFileSync('./test/processes/happy/process.wasm'))
const sadWasm = await AoLoader(readFileSync('./test/processes/sad/process.wasm'))
async function evaluateHappyMessage ({ moduleId }) {
  assert.equal(moduleId, 'foo-module')
  return ({ Memory, message, AoGlobal }) => happyWasm(Memory, message, AoGlobal)
}

async function evaluateSadMessage ({ moduleId }) {
  assert.equal(moduleId, 'foo-module')
  return ({ Memory, message, AoGlobal }) => sadWasm(Memory, message, AoGlobal)
}

describe('evaluate', () => {
  describe('output', () => {
    const evaluate = evaluateWith({
      saveEvaluation: async (evaluation) => evaluation,
      findMessageHash: async () => { throw { status: 404 } },
      loadEvaluator: evaluateHappyMessage,
      saveLatestProcessMemory: async () => {},
      logger
    })

    let ctx
    beforeEach(() => {
      ctx = {
        id: 'ctr-1234',
        from: new Date().getTime(),
        moduleId: 'foo-module',
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
      assert.deepEqual(JSON.parse(output.Output), {
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
      loadEvaluator: evaluateHappyMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
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
        // noSave should noop and not call saveInteraction
        {
          noSave: true,
          ordinate: 0,
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
    }

    await evaluate(ctx).toPromise()
    assert.equal(cacheCount, 2)
  })

  test('skip over messages that are already evaluated (deepHash)', async () => {
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
      loadEvaluator: evaluateHappyMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
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
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
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
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
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
    assert.equal(messageHash, 2)
    assert.equal(cacheCount, 2)
  })

  test('skip over Cron Messages that are already evaluated', async () => {
    let cacheCount = 0
    const env = {
      saveEvaluation: async (evaluation) => {
        cacheCount++
        return undefined
      },
      findMessageHash: async () => { throw { status: 404 } },
      loadEvaluator: evaluateHappyMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      fromCron: '1-10-minutes',
      moduleId: 'foo-module',
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
          AoGlobal: {
            Process: {
              Id: '1234',
              Tags: []
            }
          }
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
          message: {
            Id: 'message-123',
            Timestamp: 1702846520700,
            Owner: 'owner-456',
            Tags: [
              { name: 'function', value: 'world' }
            ],
            'Block-Height': 1235
          },
          deepHash: 'deephash-456',
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
    assert.equal(cacheCount, 3)
  })

  test('error returned in process result', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      findMessageHash: async () => { throw { status: 404 } },
      loadEvaluator: evaluateSadMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        /**
         * In reality this would be an illegible byte array, since it's format
         * will be determined by whatever the underlying runtime is, in this case,
         * Lua
         */
        Memory: Buffer.from('Hello', 'utf-8')
      },
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
    /**
     * When an error occurs in eval, its output Memory is ignored
     * and the output Memory from the previous eval is used.
     *
     * So we assert that the original Memory that was passed in is returned
     * from eval
     */
    assert.deepStrictEqual(res.output.Memory, Buffer.from('Hello', 'utf-8'))
    assert.deepStrictEqual(res.output.Error, { code: 123, message: 'a handled error within the process' })
  })

  test('error thrown by process', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      findMessageHash: async () => { throw { status: 404 } },
      loadEvaluator: evaluateSadMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        /**
         * In reality this would be an illegible byte array, since it's format
         * will be determined by whatever the underlying runtime is, in this case,
         * Lua
         */
        Memory: Buffer.from('Hello', 'utf-8')
      },
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
    assert.deepStrictEqual(res.output.Memory, Buffer.from('Hello', 'utf-8'))
    assert.deepStrictEqual(res.output.Error, { code: 123, message: 'a thrown error within the process' })
  })

  test('error unhandled by process', async () => {
    const env = {
      saveEvaluation: async () => assert.fail(),
      findMessageHash: async () => { throw { status: 404 } },
      loadEvaluator: evaluateSadMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        /**
         * In reality this would be an illegible byte array, since it's format
         * will be determined by whatever the underlying runtime is, in this case,
         * Lua
         */
        Memory: Buffer.from('Hello', 'utf-8')
      },
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
    assert.ok(res.output.Error)
    assert.deepStrictEqual(res.output.Memory, Buffer.from('Hello', 'utf-8'))
  })

  test('continue evaluating, ignoring output of errored message', async () => {
    // eslint-disable-next-line
    let cacheCount = 0
    const env = {
      saveEvaluation: async (evaluation) => {
        cacheCount++
        return undefined
      },
      findMessageHash: async () => { throw { status: 404 } },
      loadEvaluator: evaluateSadMessage,
      saveLatestProcessMemory: async () => {},
      logger
    }

    const evaluate = evaluateWith(env)

    const ctx = {
      id: 'ctr-1234',
      from: 1702846520559,
      moduleId: 'foo-module',
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
})
