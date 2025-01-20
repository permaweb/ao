/* eslint-disable no-throw-literal */
import { describe, test } from 'node:test'
import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { Readable } from 'node:stream'

import AoLoader from '@permaweb/ao-loader'

import { createTestLogger } from '../logger.js'
import { evaluateWith } from './evaluate.js'

const logger = createTestLogger({ name: 'ao-cu:readState' })

function toReadable (iterable) {
  return Readable.from(iterable)
}

const mockCounter = { inc: () => undefined }

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
  return ({ Memory, message, AoGlobal, close }) => {
    if (!close) return happyWasm(Memory, message, AoGlobal)
  }
}

async function evaluateSadMessage ({ moduleId }) {
  assert.equal(moduleId, 'foo-module')
  return ({ Memory, message, AoGlobal, close }) => {
    if (!close) return sadWasm(Memory, message, AoGlobal)
  }
}

describe('evaluate', () => {
  test('adds output and last to context', async () => {
    const evaluate = evaluateWith({
      findMessageBefore: async () => { throw { status: 404 } },
      loadEvaluator: evaluateHappyMessage,
      saveLatestProcessMemory: async () => {},
      evaluationCounter: {
        inc: () => undefined
      },
      gasCounter: {
        inc: () => undefined
      },
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
      messages: toReadable([
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

  test('skip over duplicate messages (dup assignment or dup push (deepHash))', async () => {
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
          if (!opts[opts.length - 1].close) evalCount++
          return e(...opts)
        }
      },
      saveLatestProcessMemory: async () => {},
      evaluationCounter: {
        inc: () => undefined
      },
      gasCounter: {
        inc: () => undefined
      },
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
      messages: toReadable([
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
          if (!opts[opts.length - 1].close) evalCount++
          return e(...opts)
        }
      },
      saveLatestProcessMemory: async () => {},
      evaluationCounter: {
        inc: () => undefined
      },
      gasCounter: {
        inc: () => undefined
      },
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
      messages: toReadable([
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
          if (!opts[opts.length - 1].close) evalCount++
          return e(...opts)
        }
      },
      saveLatestProcessMemory: async () => {},
      evaluationCounter: {
        inc: () => undefined
      },
      gasCounter: {
        inc: () => undefined
      },
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
      messages: toReadable([
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
      loadEvaluator: () => ({ message, close }) => {
        if (close) return
        assert.deepStrictEqual(
          message.Tags,
          [
            { name: 'function', value: 'hello' }
          ]
        )
        return { Memory: Buffer.from('Hello world') }
      },
      saveLatestProcessMemory: async () => {},
      evaluationCounter: {
        inc: () => undefined
      },
      gasCounter: {
        inc: () => undefined
      },
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
        Memory: Buffer.from('Hello world')
      },
      messages: toReadable([
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

  describe('tracks and saves most recent assignmentId and hashChain', () => {
    const cronOne = {
      ordinate: 1,
      isAssignment: false,
      cron: '1-20-minutes',
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

    const cronTwo = {
      ordinate: 2,
      isAssignment: false,
      cron: '1-20-minutes',
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

    const messageOne = {
      ordinate: 1,
      isAssignment: false,
      assignmentId: 'assignment-1',
      message: {
        Id: 'message-123',
        Timestamp: 1702846520559,
        Owner: 'owner-123',
        'Hash-Chain': 'hashchain-1',
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

    const messageTwo = {
      ordinate: 1,
      isAssignment: false,
      assignmentId: 'assignment-2',
      message: {
        Id: 'message-123',
        Timestamp: 1702846520559,
        Owner: 'owner-123',
        'Hash-Chain': 'hashchain-2',
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

    const args = {
      id: 'ctr-1234',
      from: new Date().getTime(),
      moduleId: 'foo-module',
      mostRecentAssignmentId: 'init-assignment-123',
      mostRecentHashChain: 'init-hashchain-123',
      moduleOptions,
      stats: {
        messages: {
          scheduled: 0,
          cron: 0,
          error: 0
        }
      },
      result: {
        Memory: Buffer.from('Hello world')
      }
    }

    test('when only cron', async () => {
      const evaluate = evaluateWith({
        findMessageBefore: async () => { throw { status: 404 } },
        loadEvaluator: () => ({ message, close }) => ({ Memory: Buffer.from('Hello world') }),
        saveLatestProcessMemory: async (a) => {
          assert.equal(a.assignmentId, args.mostRecentAssignmentId)
          assert.equal(a.hashChain, args.mostRecentHashChain)
        },
        evaluationCounter: mockCounter,
        gasCounter: mockCounter,
        logger
      })

      await evaluate({
        ...args,
        messages: toReadable([cronOne, cronTwo])
      }).toPromise()
    })

    test('intermingled cron and scheduled', async () => {
      const evaluate = evaluateWith({
        findMessageBefore: async () => { throw { status: 404 } },
        loadEvaluator: () => ({ message, close }) => ({ Memory: Buffer.from('Hello world') }),
        saveLatestProcessMemory: async (a) => {
          assert.equal(a.assignmentId, messageOne.assignmentId)
          assert.equal(a.hashChain, messageOne.message['Hash-Chain'])
        },
        evaluationCounter: mockCounter,
        gasCounter: mockCounter,
        logger
      })

      await evaluate({
        ...args,
        messages: toReadable([cronOne, messageOne, cronTwo])
      }).toPromise()
    })

    test('multiple scheduled', async () => {
      const evaluate = evaluateWith({
        findMessageBefore: async () => { throw { status: 404 } },
        loadEvaluator: () => ({ message, close }) => ({ Memory: Buffer.from('Hello world') }),
        saveLatestProcessMemory: async (a) => {
          assert.equal(a.assignmentId, messageTwo.assignmentId)
          assert.equal(a.hashChain, messageTwo.message['Hash-Chain'])
        },
        evaluationCounter: mockCounter,
        gasCounter: mockCounter,
        logger
      })

      await evaluate({
        ...args,
        messages: toReadable([cronOne, messageOne, cronTwo, messageTwo])
      }).toPromise()
    })
  })
})
