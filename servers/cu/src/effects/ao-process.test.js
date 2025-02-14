/* eslint-disable no-throw-literal */
import { describe, test, before } from 'node:test'
import assert from 'node:assert'
import { gzip } from 'node:zlib'
import { promisify } from 'node:util'
import { Readable } from 'node:stream'

import bytes from 'bytes'

import { createTestLogger } from '../domain/logger.js'
import { findLatestProcessMemorySchema, findProcessSchema, saveLatestProcessMemorySchema, saveProcessSchema } from '../domain/dal.js'
import { PROCESSES_TABLE } from './db.js'
import { LATEST, createProcessMemoryCache, findFileCheckpointBeforeWith, findLatestProcessMemoryWith, findProcessWith, saveCheckpointWith, saveLatestProcessMemoryWith, saveProcessWith } from './ao-process.js'

const gzipP = promisify(gzip)
const logger = createTestLogger({ name: 'ao-cu:ao-process' })

describe('ao-process', () => {
  describe('findProcess', () => {
    test('find the process', async () => {
      const now = Math.floor(new Date().getTime() / 1000)
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          db: {
            query: async () => [{
              id: 'process-123',
              owner: JSON.stringify({ address: 'owner-123', key: 'key-123' }),
              tags: JSON.stringify([{ name: 'foo', value: 'bar' }]),
              signature: 'sig-123',
              anchor: null,
              data: 'data-123',
              block: JSON.stringify({
                height: 123,
                timestamp: now
              })
            }]
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
      assert.deepStrictEqual(res, {
        id: 'process-123',
        owner: { address: 'owner-123', key: 'key-123' },
        tags: [{ name: 'foo', value: 'bar' }],
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        block: {
          height: 123,
          timestamp: now
        }
      })
    })

    test('return 404 status if not found', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          db: {
            query: async () => []
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          return { ok: true }
        })

      assert(res.ok)
    })

    test('passively delete record and return 404 status if record has invalid owner', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          db: {
            query: async () => [{
              id: 'process-123',
              owner: 'owner-123', // old preparsed value for owner
              tags: JSON.stringify([{ name: 'foo', value: 'bar' }]),
              signature: 'sig-123',
              anchor: null,
              data: 'data-123',
              block: JSON.stringify({
                height: 123,
                timestamp: new Date()
              })
            }],
            run: async ({ sql, parameters }) => {
              assert.ok(sql.trim().startsWith(`DELETE FROM ${PROCESSES_TABLE}`))
              assert.deepStrictEqual(parameters, ['process-123'])
            }
          },
          logger
        })
      )

      const res = await findProcess({ processId: 'process-123' })
        .catch(err => {
          assert.equal(err.status, 404)
          assert.equal(err.message, 'Process record invalid')
          return { ok: true }
        })

      assert(res.ok)
    })

    test('bubble error', async () => {
      const findProcess = findProcessSchema.implement(
        findProcessWith({
          db: {
            query: async () => { throw { status: 500 } }
          },
          logger
        })
      )

      await findProcess({ processId: 'process-123' })
        .then(assert.fail)
        .catch(assert.ok)
    })
  })

  describe('saveProcess', () => {
    const now = Math.floor(new Date().getTime() / 1000)
    test('save the process', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          db: {
            run: ({ parameters }) => {
              assert.deepStrictEqual(parameters, [
                'process-123',
                'sig-123',
                null, // data is nullified
                null,
                JSON.stringify({ address: 'owner-123', key: 'key-123' }),
                JSON.stringify([{ name: 'foo', value: 'bar' }]),
                JSON.stringify({ height: 123, timestamp: now })
              ])
              return Promise.resolve(true)
            }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: { address: 'owner-123', key: 'key-123' },
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        tags: [{ name: 'foo', value: 'bar' }],
        block: {
          height: 123,
          timestamp: now
        }
      })
    })

    test('noop if the process already exists', async () => {
      const saveProcess = saveProcessSchema.implement(
        saveProcessWith({
          db: {
            run: async ({ sql }) => {
              assert.ok(sql.trim().startsWith('INSERT OR IGNORE'))
            }
          },
          logger
        })
      )

      await saveProcess({
        id: 'process-123',
        owner: { address: 'owner-123', key: 'key-123' },
        tags: [{ name: 'foo', value: 'bar' }],
        signature: 'sig-123',
        anchor: null,
        data: 'data-123',
        block: {
          height: 123,
          timestamp: now
        }
      })
    })
  })

  describe('findFileCheckpointBeforeWith', () => {
    const now = `${new Date().getTime()}`
    const tenSecondsAgo = `${now - 10000}`
    const nineSecondsAgo = tenSecondsAgo + 1000
    const evaluation = {
      processId: 'process-123',
      moduleId: 'module-123',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      epoch: 0,
      nonce: 11,
      timestamp: now,
      blockHeight: 123,
      ordinate: '11',
      encoding: 'gzip'
    }

    test('should return the single checkpoint from a file', async () => {
      const findFileCheckpointBefore = findFileCheckpointBeforeWith({
        db: {
          query: async () => [{ file: 'state-process-123.dat', evaluation: JSON.stringify(evaluation) }]
        }
      })

      const res = await findFileCheckpointBefore({
        processId: 'process-123',
        before: {
          timestamp: now,
          ordinate: '12',
          cron: undefined
        }
      })
      assert.deepStrictEqual(res, {
        file: 'state-process-123.dat',
        ...evaluation
      })
    })

    test('should return the latest checkpoint from a file BEFORE the before', async () => {
      const findFileCheckpointBefore = findFileCheckpointBeforeWith({
        db: {
          query: async () => [
            { file: 'state-process-123.dat', evaluation: JSON.stringify({ ...evaluation, timestamp: tenSecondsAgo }) },
            { file: 'state-process-456.dat', evaluation: JSON.stringify({ ...evaluation, timestamp: nineSecondsAgo }) }
          ]
        }
      })

      const res = await findFileCheckpointBefore({
        processId: 'process-123',
        before: {
          timestamp: now,
          ordinate: '11',
          cron: undefined
        }
      })

      assert.deepStrictEqual(res, {
        file: 'state-process-456.dat',
        ...evaluation,
        timestamp: nineSecondsAgo
      })
    })

    test('should return undefined if no checkpoint is earlier than target', async () => {
      const findFileCheckpointBefore = findFileCheckpointBeforeWith({
        db: {
          query: async () => [{ file: 'state-process-789.dat', evaluation: JSON.stringify(evaluation) }]
        }
      })

      const res = await findFileCheckpointBefore({
        processId: 'process-123',
        before: {
          timestamp: tenSecondsAgo,
          ordinate: '10',
          cron: undefined
        }
      })

      assert.equal(res, undefined)
    })

    test('should return undefined if no checkpoints are present', async () => {
      const now = new Date()
      const findFileCheckpointBefore = findFileCheckpointBeforeWith({
        db: {
          query: async () => []
        }
      })

      const res = await findFileCheckpointBefore({
        processId: 'process-123',
        before: {
          timestamp: now,
          ordinate: '12',
          cron: undefined
        }
      })

      assert.equal(res, undefined)
    })
  })

  describe('findLatestProcessMemory', () => {
    const PROCESS = 'process-123'
    const now = new Date().getTime()
    const tenSecondsAgo = now - 10000
    const Memory = Buffer.from('hello world')
    let zipped
    const cachedEval = {
      processId: PROCESS,
      moduleId: 'module-123',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      epoch: 0,
      nonce: 11,
      timestamp: tenSecondsAgo,
      blockHeight: 123,
      ordinate: '11',
      encoding: 'gzip'
    }

    const target = {
      processId: PROCESS,
      timestamp: now - 1000,
      ordinate: '13',
      cron: undefined
    }
    const latestTarget = {
      processId: PROCESS,
      timestamp: undefined,
      ordinate: undefined,
      cron: undefined
    }

    before(async () => {
      zipped = await gzipP(Memory)
    })

    describe('MEMORY checkpoint', () => {
      const deps = {
        cache: {
          get: () => ({
            Memory: zipped,
            evaluation: cachedEval
          })
        },
        readProcessMemoryFile: async () => assert.fail('should not call if memory is in cache'),
        readFileCheckpointMemory: async () => assert.fail('should not call if memory is in cache'),
        findFileCheckpointBefore: async () => assert.fail('should not call if found in cache'),
        findRecordCheckpointBefore: async () => assert.fail('should not call if found in cache'),
        address: async () => assert.fail('should not call if found in cache'),
        queryGateway: async () => assert.fail('should not call if found in cache'),
        queryCheckpointGateway: async () => assert.fail('should not call if found in cache'),
        loadTransactionData: async () => assert.fail('should not call if found in cache'),
        logger,
        PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
        IGNORE_ARWEAVE_CHECKPOINTS: [],
        PROCESS_CHECKPOINT_TRUSTED_OWNERS: [],
        DIR: 'fake/directory/'
      }
      const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

      describe('should decode memory', () => {
        test('hot in a cache', async () => {
          const res = await findLatestProcessMemory(target)
          assert.deepStrictEqual(res.Memory, Memory)
        })

        test('drained to a file', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            cache: {
              get: () => ({
                File: Promise.resolve('state-process123.dat'),
                evaluation: cachedEval
              })
            },
            readProcessMemoryFile: async (file) => {
              assert.equal(file, 'state-process123.dat')
              return zipped
            }
          }))

          const res = await findLatestProcessMemory(target)
          assert.deepStrictEqual(res.Memory, Memory)
        })
      })

      describe('should NOT decode the memory', () => {
        test('drained to a file', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            cache: {
              get: () => ({
                File: Promise.resolve('state-process123.dat'),
                evaluation: { ...cachedEval, encoding: undefined }
              })
            },
            readProcessMemoryFile: async (file) => {
              assert.equal(file, 'state-process123.dat')
              return Memory
            }
          }))
          const res = await findLatestProcessMemory(target)
          assert.deepStrictEqual(res.Memory, Memory)
        })
      })

      describe('should use the memory', () => {
        test('when targeting a specific message', async () => {
          const res = await findLatestProcessMemory(target)

          assert.deepStrictEqual(res, {
            src: 'memory',
            fromFile: undefined,
            Memory,
            moduleId: 'module-123',
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('when targeting latest', async () => {
          const res = await findLatestProcessMemory(latestTarget)

          assert.deepStrictEqual(res, {
            src: 'memory',
            fromFile: undefined,
            Memory,
            moduleId: 'module-123',
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })
      })

      test('should reload the memory from a file', async () => {
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => ({
              File: Promise.resolve('state-process123.dat'),
              evaluation: cachedEval
            })
          },
          readProcessMemoryFile: async (file) => {
            assert.equal(file, 'state-process123.dat')
            return zipped
          }
        }))

        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res, {
          src: 'memory',
          fromFile: 'state-process123.dat',
          Memory,
          moduleId: 'module-123',
          assignmentId: cachedEval.assignmentId,
          hashChain: cachedEval.hashChain,
          epoch: cachedEval.epoch,
          nonce: cachedEval.nonce,
          timestamp: cachedEval.timestamp,
          blockHeight: cachedEval.blockHeight,
          cron: cachedEval.cron,
          ordinate: cachedEval.ordinate
        })
      })

      test.todo('should omit the memory if omitMemory is received', async () => {})
    })

    describe('FILE checkpoint', () => {
      const deps = {
        cache: {
          get: () => undefined
        },
        findFileCheckpointBefore: async ({ processId, before }) => {
          assert.equal(processId, PROCESS)
          assert.equal(before, LATEST)
          return { file: 'state-process-123.dat', ...cachedEval }
        },
        readProcessMemoryFile: async () => assert.fail('should not call if cache not drained to file'),
        readFileCheckpointMemory: async (file) => {
          assert.equal(file, 'state-process-123.dat')
          return zipped
        },
        findRecordCheckpointBefore: async () => assert.fail('should not call if file checkpoint'),
        address: async () => assert.fail('should not call if found in file checkpoint'),
        queryGateway: async () => assert.fail('should not call if found in file checkpoint'),
        queryCheckpointGateway: async () => assert.fail('should not call if file checkpoint'),
        loadTransactionData: async (id) => {
          assert.equal(id, 'tx-123')
          return new Response(Readable.toWeb(Readable.from(zipped)))
        },
        logger,
        PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
        IGNORE_ARWEAVE_CHECKPOINTS: [],
        PROCESS_CHECKPOINT_TRUSTED_OWNERS: []
      }
      const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

      describe('should use if in LRU In-Memory Cache cannot be used', () => {
        test('LRU In-Memory cache failed to drain to a file', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            cache: {
              get: () => ({
                File: Promise.resolve(undefined),
                evaluation: cachedEval
              })
            }
          }))

          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'file',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('no checkpoint in LRU In-Memory cache', async () => {
          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'file',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('when targeting latest', async () => {
          const { Memory, ...res } = await findLatestProcessMemory(latestTarget)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'file',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })
      })

      test('should omit the memory if omitMemory is received', async () => {
        let readFile = false
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          findFileCheckpointBefore: async () => {
            return { file: 'state-process123.dat', ...cachedEval }
          },
          readProcessMemoryFile: async (file) => {
            assert.equal(file, 'state-process123.dat')
            readFile = true
          }
        }))
        const { Memory, ...res } = await findLatestProcessMemory({ ...latestTarget, omitMemory: true })

        assert.ok(!readFile)
        assert.equal(res.src, 'file')
        assert.equal(Memory, null)
      })
    })

    describe('RECORD checkpoint', () => {
      const deps = {
        cache: {
          get: () => undefined
        },
        findFileCheckpointBefore: async () => undefined,
        readProcessMemoryFile: async () => assert.fail('should not call if cache not drained to file'),
        readFileCheckpointMemory: async (file) => assert.fail('should not call if no file checkpoint'),
        findRecordCheckpointBefore: async ({ processId, before }) => {
          assert.equal(processId, PROCESS)
          assert.equal(before, LATEST)

          return {
            Memory: { id: 'tx-123', encoding: 'gzip' },
            evaluation: cachedEval
          }
        },
        address: async () => assert.fail('should not call if found in record checkpoint'),
        queryGateway: async () => assert.fail('should not call if found in record checkpoint'),
        queryCheckpointGateway: async () => assert.fail('should not call if record checkpoint'),
        loadTransactionData: async (id) => {
          assert.equal(id, 'tx-123')
          return new Response(Readable.toWeb(Readable.from(zipped)))
        },
        logger,
        PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
        IGNORE_ARWEAVE_CHECKPOINTS: [],
        PROCESS_CHECKPOINT_TRUSTED_OWNERS: [],
        DIR: 'fake/directory/'
      }
      const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

      describe('should use if file checkpoint cannot be used', () => {
        test('no file checkpoint', async () => {
          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'record',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('when targeting latest', async () => {
          const { Memory, ...res } = await findLatestProcessMemory(latestTarget)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'record',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('file checkpoint file could not be read', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            findFileCheckpointBefore: async () => {
              return { file: 'state-process123.dat', ...cachedEval }
            },
            readProcessMemoryFile: async () => assert.fail('should not call if cache not drained to file'),
            readFileCheckpointMemory: async (file) => { throw new Error('ENOENT') }
          }))

          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'record',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })
      })

      test('should decode the memory if needed', async () => {
        const res = await findLatestProcessMemory(target)
        assert.deepStrictEqual(res.Memory, Memory)
      })

      test('should NOT decode the memory if not needed', async () => {
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          findRecordCheckpointBefore: async () => ({
            Memory: { id: 'tx-not-encoded', encoding: undefined },
            evaluation: {
              ...cachedEval,
              encoding: undefined
            }
          }),
          loadTransactionData: async (id) => {
            assert.equal(id, 'tx-not-encoded')
            return new Response(Readable.toWeb(Readable.from(Memory)))
          }
        }))

        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res.Memory, Memory)
      })

      test.todo('should omit the memory if omitMemory is received', async () => {})
    })

    describe('ARWEAVE checkpoint', () => {
      const edges = [
        {
          node: {
            id: 'tx-123',
            tags: [
              { name: 'Module', value: `${cachedEval.moduleId}` },
              { name: 'Timestamp', value: `${cachedEval.timestamp}` },
              { name: 'Assignment', value: `${cachedEval.assignmentId}` },
              { name: 'Hash-Chain', value: `${cachedEval.hashChain}` },
              { name: 'Epoch', value: `${cachedEval.epoch}` },
              { name: 'Nonce', value: `${cachedEval.nonce}` },
              { name: 'Block-Height', value: `${cachedEval.blockHeight}` },
              { name: 'Content-Encoding', value: `${cachedEval.encoding}` }
            ]
          }
        }
      ]
      const deps = {
        cache: {
          get: () => undefined
        },
        findFileCheckpointBefore: async () => undefined,
        findRecordCheckpointBefore: async () => undefined,
        address: async () => 'address-123',
        queryGateway: async ({ query, variables }) => {
          assert.ok(query)
          assert.deepStrictEqual(variables, {
            owners: ['address-123'],
            processId: PROCESS,
            limit: 50
          })

          return { data: { transactions: { edges } } }
        },
        queryCheckpointGateway: async () => assert.fail('should not call if default gateway is successful'),
        loadTransactionData: async (id) => {
          assert.equal(id, 'tx-123')
          return new Response(Readable.toWeb(Readable.from(zipped)))
        },
        logger,
        PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
        IGNORE_ARWEAVE_CHECKPOINTS: [],
        PROCESS_CHECKPOINT_TRUSTED_OWNERS: []
      }
      const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

      describe('should use if the Memory checkpoint, File checkpoint ,and record checkpoint cannot be used', async () => {
        test('no file checkpoint is found', async () => {
          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'arweave',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('when targeting latest', async () => {
          const { Memory, ...res } = await findLatestProcessMemory(latestTarget)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'arweave',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('record checkpoint points to ignored checkpoint on arweave', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            findRecordCheckpointBefore: async () => ({ Memory: { id: 'file_ignored' } }),
            findFileCheckpointBefore: async () => undefined,
            IGNORE_ARWEAVE_CHECKPOINTS: ['file_ignored']
          }))

          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'arweave',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('record checkpoint fails to be downloaded', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            findRecordCheckpointBefore: async () => ({ Memory: { id: 'fail' } }),
            findFileCheckpointBefore: async () => undefined,
            loadTransactionData: async (id) => {
              if (id === 'fail') throw new Error('woops')
              return deps.loadTransactionData(id)
            }
          }))

          const { Memory, ...res } = await findLatestProcessMemory(target)

          assert.ok(Memory)
          assert.deepStrictEqual(res, {
            src: 'arweave',
            moduleId: cachedEval.moduleId,
            assignmentId: cachedEval.assignmentId,
            hashChain: cachedEval.hashChain,
            epoch: cachedEval.epoch,
            nonce: cachedEval.nonce,
            timestamp: cachedEval.timestamp,
            blockHeight: cachedEval.blockHeight,
            cron: cachedEval.cron,
            ordinate: cachedEval.ordinate
          })
        })

        test('should query all trusted owners if not empty', async () => {
          let assertionFailed = false
          let addressCalled = false
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            PROCESS_CHECKPOINT_TRUSTED_OWNERS: ['wallet-123', 'wallet-456'],
            queryGateway: async ({ query, variables }) => {
              try {
                assert.deepStrictEqual(variables, { owners: ['wallet-123', 'wallet-456'], processId: 'process-123', limit: 50 })
                assert.ok(query)
              } catch (e) {
                assertionFailed = true
              }
              return { data: { transactions: { edges: [] } } }
            },
            address: async () => { addressCalled = true }
          }))
          await findLatestProcessMemory(target)

          assert.ok(!assertionFailed)
          assert.ok(!addressCalled)
        })
      })

      test('should decode if needed', async () => {
        const res = await findLatestProcessMemory(target)
        assert.deepStrictEqual(res.Memory, Memory)
      })

      test('should NOT decode the memory if not needed', async () => {
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          queryGateway: async () => ({
            data: {
              transactions: {
                edges: [
                  {
                    ...edges[0],
                    node: {
                      ...edges[0].node,
                      id: 'tx-not-encoded',
                      tags: [
                        { name: 'Module', value: `${cachedEval.moduleId}` },
                        { name: 'Assignment', value: `${cachedEval.assignmentId}` },
                        { name: 'Hash-Chain', value: `${cachedEval.hashChain}` },
                        { name: 'Timestamp', value: `${cachedEval.timestamp}` },
                        { name: 'Epoch', value: `${cachedEval.epoch}` },
                        { name: 'Nonce', value: `${cachedEval.nonce}` },
                        { name: 'Block-Height', value: `${cachedEval.blockHeight}` },
                        { name: 'Not-Content-Encoding', value: `${cachedEval.encoding}` }
                      ]
                    }
                  }
                ]
              }
            }
          }),
          loadTransactionData: async (id) => {
            assert.equal(id, 'tx-not-encoded')
            return new Response(Readable.toWeb(Readable.from(Memory)))
          }
        }))
        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res.Memory, Memory)
      })

      test('should use the latest retrieved checkpoint', async () => {
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          queryGateway: async () => ({
            data: {
              transactions: {
                edges: [
                  edges[0],
                  {
                    ...edges[0],
                    node: {
                      ...edges[0].node,
                      tags: [
                        { name: 'Module', value: `${cachedEval.moduleId}` },
                        { name: 'Assignment', value: `${cachedEval.assignmentId}` },
                        { name: 'Hash-Chain', value: `${cachedEval.hashChain}` },
                        { name: 'Timestamp', value: `${cachedEval.timestamp + 1000}` },
                        { name: 'Epoch', value: `${cachedEval.epoch}` },
                        { name: 'Nonce', value: '12' },
                        { name: 'Block-Height', value: `${cachedEval.blockHeight}` },
                        { name: 'Content-Encoding', value: `${cachedEval.encoding}` }
                      ]
                    }
                  }
                ]
              }
            }
          })
        }))

        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res.ordinate, '12')
      })

      test('should use the latest retrieved checkpoint that is NOT ignored', async () => {
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          queryGateway: async () => ({
            data: {
              transactions: {
                edges: [
                  edges[0],
                  {
                    node: {
                      ...edges[0].node,
                      // latest is ignored, so use earlier found checkpoint
                      id: 'ignored',
                      tags: [
                        { name: 'Module', value: `${cachedEval.moduleId}` },
                        // purposefully omitted to ensure robustness
                        // { name: 'Assignment', value: `${cachedEval.assignmentId}` },
                        // { name: 'Hash-Chain', value: `${cachedEval.hashChain}` },
                        { name: 'Timestamp', value: `${cachedEval.timestamp + 1000}` },
                        { name: 'Epoch', value: `${cachedEval.epoch}` },
                        { name: 'Nonce', value: '12' },
                        { name: 'Block-Height', value: `${cachedEval.blockHeight}` },
                        { name: 'Content-Encoding', value: `${cachedEval.encoding}` }
                      ]
                    }
                  }
                ]
              }
            }
          }),
          IGNORE_ARWEAVE_CHECKPOINTS: ['ignored']
        }))

        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res.ordinate, '11')
      })

      test('should retry querying the gateway', async () => {
        let count = 1
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          queryGateway: async () => {
            if (count++ < 2) throw new Error('timeout')

            return {
              data: {
                transactions: {
                  edges: [
                    {
                      ...edges[0],
                      node: {
                        ...edges[0].node,
                        tags: [
                          { name: 'Module', value: `${cachedEval.moduleId}` },
                          { name: 'Assignment', value: `${cachedEval.assignmentId}` },
                          { name: 'Hash-Chain', value: `${cachedEval.hashChain}` },
                          { name: 'Timestamp', value: `${cachedEval.timestamp + 1000}` },
                          { name: 'Epoch', value: `${cachedEval.epoch}` },
                          { name: 'Nonce', value: '12' },
                          { name: 'Block-Height', value: `${cachedEval.blockHeight}` },
                          { name: 'Content-Encoding', value: `${cachedEval.encoding}` }
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        }))

        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res.ordinate, '12')
      })

      test('should fallback to Checkpoint gateway if default gateway reaches max retries', async () => {
        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
          ...deps,
          queryGateway: async () => { throw new Error('timeout') },
          queryCheckpointGateway: async ({ query, variables }) => {
            assert.ok(query)
            assert.deepStrictEqual(variables, {
              owners: ['address-123'],
              processId: PROCESS,
              limit: 50
            })

            return {
              data: {
                transactions: {
                  edges: [
                    {
                      ...edges[0],
                      node: {
                        ...edges[0].node,
                        tags: [
                          { name: 'Module', value: `${cachedEval.moduleId}` },
                          { name: 'Timestamp', value: `${cachedEval.timestamp + 1000}` },
                          { name: 'Epoch', value: `${cachedEval.epoch}` },
                          { name: 'Nonce', value: '12' },
                          { name: 'Block-Height', value: `${cachedEval.blockHeight}` },
                          { name: 'Content-Encoding', value: `${cachedEval.encoding}` }
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        }))

        const res = await findLatestProcessMemory(target)

        assert.deepStrictEqual(res.ordinate, '12')
      })

      test.todo('should omit the memory if omitMemory is received', async () => {})
    })

    describe('cold start', () => {
      const deps = {
        cache: {
          get: () => undefined
        },
        findFileCheckpointBefore: async () => undefined,
        findRecordCheckpointBefore: async () => undefined,
        address: async () => 'address-123',
        queryCheckpointGateway: async ({ query, variables }) => ({ data: { transactions: { edges: [] } } }),
        queryGateway: async ({ query, variables }) => ({ data: { transactions: { edges: [] } } }),
        loadTransactionData: async (id) => {
          assert.equal(id, 'tx-123')
          return new Response(Readable.toWeb(Readable.from(zipped)))
        },
        logger,
        PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
        IGNORE_ARWEAVE_CHECKPOINTS: [],
        PROCESS_CHECKPOINT_TRUSTED_OWNERS: []
      }
      const COLDSTART = {
        src: 'cold_start',
        Memory: null,
        moduleId: undefined,
        assignmentId: undefined,
        hashChain: undefined,
        timestamp: undefined,
        epoch: undefined,
        nonce: undefined,
        blockHeight: undefined,
        cron: undefined,
        ordinate: '0'

      }
      const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

      describe('should cold start if LRU In-Memory Cache, File Checkpoint, Record Checkpoints, and Gateway Checkpoints all cannot be used', async () => {
        test('no checkpoint found on gateway', async () => {
          const res = await findLatestProcessMemory(target)
          assert.deepStrictEqual(res, COLDSTART)
        })

        test('gateway query exceeds retries', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            queryGateway: async () => {
              throw new Error('timeout')
            }
          }))

          const res = await findLatestProcessMemory(target)

          assert.deepStrictEqual(res, COLDSTART)
        })

        test('process is configured to ignore gateway checkpoints', async () => {
          const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith({
            ...deps,
            PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [PROCESS]
          }))
          const res = await findLatestProcessMemory(target)
          assert.deepStrictEqual(res, COLDSTART)
        })
      })
    })

    describe('should reject with a 425', () => {
      const laterCachedEval = {
        ...cachedEval,
        timestamp: now,
        ordinate: '15',
        nonce: 15
      }

      test('if the cached checkpoint is later than the target', async () => {
        const deps = {
          cache: {
            get: () => ({
              Memory: zipped,
              evaluation: laterCachedEval
            })
          },
          findFileCheckpointBefore: async () => assert.fail('should not call if found in cache'),
          findRecordCheckpointBefore: async () => assert.fail('should not call if found in cache'),
          address: async () => assert.fail('should not call if found in file checkpoint'),
          queryGateway: async () => assert.fail('should not call if found in file checkpoint'),
          queryCheckpointGateway: async () => assert.fail('should not call if file checkpoint'),
          loadTransactionData: async (id) => {
            assert.equal(id, 'tx-123')
            return new Response(Readable.toWeb(Readable.from(zipped)))
          },
          logger,
          PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
          IGNORE_ARWEAVE_CHECKPOINTS: [],
          PROCESS_CHECKPOINT_TRUSTED_OWNERS: []
        }

        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

        await findLatestProcessMemory(target)
          .then(() => assert.fail('should reject'))
          .catch((err) => assert.deepStrictEqual(err, {
            status: 425,
            ordinate: laterCachedEval.ordinate,
            message: 'no cached process memory found'
          }))
      })

      test('if nothing in LRU In-Memory cache and file is later than the target', async () => {
        const deps = {
          cache: {
            get: () => undefined
          },
          findFileCheckpointBefore: async () => {
            return { file: 'state-process123.dat', ...laterCachedEval }
          },
          readFileCheckpointMemory: async (file) => {
            assert.equal(file, 'state-process123.dat')
            return zipped
          },
          findRecordCheckpointBefore: async () => assert.fail('should not call if found in cache'),
          address: async () => assert.fail('should not call if found in file checkpoint'),
          queryGateway: async () => assert.fail('should not call if found in file checkpoint'),
          queryCheckpointGateway: async () => assert.fail('should not call if file checkpoint'),
          loadTransactionData: async (id) => {
            assert.equal(id, 'tx-123')
            return new Response(Readable.toWeb(Readable.from(zipped)))
          },
          logger,
          PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
          IGNORE_ARWEAVE_CHECKPOINTS: [],
          PROCESS_CHECKPOINT_TRUSTED_OWNERS: []
        }

        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

        await findLatestProcessMemory(target)
          .then(() => assert.fail('should reject'))
          .catch((err) => assert.deepStrictEqual(err, {
            status: 425,
            ordinate: laterCachedEval.ordinate,
            message: 'no cached process memory found'
          }))
      })

      test('if nothing in LRU In-Memory Cache, no file checkpoint, and record checkpoint is later than the target', async () => {
        const deps = {
          cache: {
            get: () => undefined
          },
          findFileCheckpointBefore: async () => undefined,
          findRecordCheckpointBefore: async ({ processId, before }) => {
            assert.equal(processId, PROCESS)
            assert.equal(before, LATEST)

            return {
              Memory: { id: 'tx-123', encoding: 'gzip' },
              evaluation: laterCachedEval
            }
          },
          address: async () => assert.fail('should not call if found in file checkpoint'),
          queryGateway: async () => assert.fail('should not call if found in file checkpoint'),
          queryCheckpointGateway: async () => assert.fail('should not call if file checkpoint'),
          loadTransactionData: async (id) => {
            assert.equal(id, 'tx-123')
            return new Response(Readable.toWeb(Readable.from(zipped)))
          },
          logger,
          PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
          IGNORE_ARWEAVE_CHECKPOINTS: [],
          PROCESS_CHECKPOINT_TRUSTED_OWNERS: [],
          fileExists: () => true,
          DIR: 'fake/directory/'
        }

        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

        await findLatestProcessMemory(target)
          .then(() => assert.fail('should reject'))
          .catch((err) => assert.deepStrictEqual(err, {
            status: 425,
            ordinate: laterCachedEval.ordinate,
            message: 'no cached process memory found'
          }))
      })

      test('if nothing in LRU In-Memory Cache, no file checkpoint, and no record checkpoint, and gateway checkpoint is later than the target', async () => {
        const deps = {
          cache: {
            get: () => undefined
          },
          findFileCheckpointBefore: async () => undefined,
          findRecordCheckpointBefore: async () => undefined,
          address: async () => 'address-123',
          queryGateway: async () => ({
            data: {
              transactions: {
                edges: [
                  {
                    node: {
                      id: 'tx-123',
                      tags: [
                        { name: 'Module', value: `${laterCachedEval.moduleId}` },
                        { name: 'Assignment', value: `${cachedEval.assignmentId}` },
                        { name: 'Hash-Chain', value: `${cachedEval.hashChain}` },
                        { name: 'Timestamp', value: `${laterCachedEval.timestamp}` },
                        { name: 'Epoch', value: `${laterCachedEval.epoch}` },
                        { name: 'Nonce', value: `${laterCachedEval.nonce}` },
                        { name: 'Block-Height', value: `${laterCachedEval.blockHeight}` },
                        { name: 'Content-Encoding', value: `${laterCachedEval.encoding}` }
                      ]
                    }
                  }
                ]
              }
            }
          }),
          queryCheckpointGateway: async () => assert.fail('should not call if default gateway is successful'),
          loadTransactionData: async (id) => {
            assert.equal(id, 'tx-123')
            return new Response(Readable.toWeb(Readable.from(zipped)))
          },
          logger,
          PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: [],
          PROCESS_CHECKPOINT_TRUSTED_OWNERS: [],
          fileExists: () => true,
          DIR: 'fake/directory/'
        }

        const findLatestProcessMemory = findLatestProcessMemorySchema.implement(findLatestProcessMemoryWith(deps))

        await findLatestProcessMemory(target)
          .then(() => assert.fail('should reject'))
          .catch((err) => assert.deepStrictEqual(err, {
            status: 425,
            ordinate: laterCachedEval.ordinate,
            message: 'no cached process memory found'
          }))
      })
    })
  })

  describe('saveLatestProcessMemory', () => {
    const PROCESS = 'process-123'
    const now = new Date().getTime()
    const tenSecondsAgo = now - 10000
    const Memory = Buffer.from('hello world')
    const cachedEval = {
      processId: PROCESS,
      moduleId: 'module-123',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      epoch: 0,
      nonce: 11,
      timestamp: tenSecondsAgo,
      blockHeight: 123,
      ordinate: '11',
      encoding: 'gzip',
      gasUsed: BigInt(100)
    }
    const cachedEvalFuture = {
      processId: PROCESS,
      moduleId: 'module-1234',
      assignmentId: 'assignment-123',
      hashChain: 'hashchain-123',
      epoch: 0,
      nonce: 14,
      timestamp: now + 1000,
      blockHeight: 123,
      ordinate: '14',
      encoding: 'gzip',
      gasUsed: BigInt(100)
    }
    const targetWithNoGasUsed = {
      processId: PROCESS,
      Memory: Buffer.from('Hello World'),
      timestamp: now - 1000,
      ordinate: '13',
      cron: undefined
    }
    const targetWithLessGasUsed = {
      processId: PROCESS,
      Memory: Buffer.from('Hello World'),
      timestamp: now - 1000,
      ordinate: '13',
      cron: undefined,
      gasUsed: BigInt(50)
    }
    const targetWithGasUsed = {
      processId: PROCESS,
      Memory: Buffer.from('Hello World'),
      timestamp: now - 1000,
      ordinate: '13',
      cron: undefined,
      gasUsed: BigInt(50)
    }

    describe('updating the cache', () => {
      const deps = {
        cache: {
          get: () => ({
            Memory,
            evaluation: cachedEvalFuture
          }),
          set: (f) => assert.fail('should not call if later found in cache')
        },
        logger,
        saveCheckpoint: () => assert.fail('should not call if found in cache'),
        EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD: BigInt(200)
      }

      test('should not update if the cache entry is ahead of provided save', async () => {
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith(deps))
        const res = await saveLatestProcessMemory(targetWithGasUsed)
        assert.equal(res, undefined)
      })

      test('should update if the cache entry is ahead of provided save', async () => {
        let cacheUpdated = false
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => ({
              Memory,
              evaluation: cachedEval
            }),
            set: () => { cacheUpdated = true }
          }
        }))
        await saveLatestProcessMemory(targetWithGasUsed)
        assert.ok(cacheUpdated)
      })

      test('should update if the cache entry is equal to provided save, AND cache does not contain the Memory', async () => {
        let cacheUpdated = false
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => ({
              Memory: undefined,
              evaluation: cachedEval
            }),
            set: () => { cacheUpdated = true }
          }
        }))
        await saveLatestProcessMemory({
          ...targetWithGasUsed,
          timestamp: cachedEval.timestamp,
          ordinate: cachedEval.ordinate,
          cron: cachedEval.cron
        })
        assert.ok(cacheUpdated)
      })

      test('should NOT update if the cache entry is equal to provided save, AND contains the Memory', async () => {
        let cacheUpdated = false
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => ({
              Memory,
              evaluation: cachedEval
            }),
            set: () => { cacheUpdated = true }
          }
        }))
        await saveLatestProcessMemory({
          ...targetWithGasUsed,
          timestamp: cachedEval.timestamp,
          ordinate: cachedEval.ordinate,
          cron: cachedEval.cron
        })
        assert.ok(!cacheUpdated)
      })

      test('should update if there is no cache entry', async () => {
        let cacheUpdated = false
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => null,
            set: () => { cacheUpdated = true }
          }
        }))
        await saveLatestProcessMemory(targetWithGasUsed)
        assert.ok(cacheUpdated)
      })

      test('should increment gasUsed when updating cache', async () => {
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => ({
              Memory,
              evaluation: cachedEval
            }),
            set: (processId, { evaluation }) => {
              assert.equal(processId, 'process-123')
              assert.equal(evaluation.gasUsed, BigInt(150))
            }
          },
          EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD: BigInt(200)
        }))
        await saveLatestProcessMemory(targetWithGasUsed)
      })
    })

    describe('creating a checkpoint', () => {
      const deps = {
        cache: {
          get: () => ({
            Memory,
            evaluation: { ...cachedEval, moduleId: 'mod-12345' }
          }),
          set: () => null
        },
        logger,
        saveCheckpoint: () => assert.fail('should not call if found in cache'),
        EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD: BigInt(200)
      }

      test('should not create checkpoint if gasUsed less than checkpoint threshold', async () => {
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({ ...deps }))
        const res = await saveLatestProcessMemory(targetWithLessGasUsed)
        assert.equal(res, undefined)
      })

      test('should not create checkpoint if no gasUsed', async () => {
        const saveLatestProcessMemory = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith(deps))
        const res = await saveLatestProcessMemory(targetWithNoGasUsed)
        assert.equal(res, undefined)
      })

      test('should not create checkpoint if no checkpoint threshold', async () => {
        const saveLatestProcessMemoryWithNoThreshold = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({ ...deps, EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD: 0 }))
        const res = await saveLatestProcessMemoryWithNoThreshold(targetWithGasUsed)
        assert.equal(res, undefined)
      })

      test('should create checkpoint if gas used greater than threshold, reset gas to 0', async () => {
        let checkpointSaved = false
        const saveLatestProcessMemoryWithNoThreshold = saveLatestProcessMemorySchema.implement(saveLatestProcessMemoryWith({
          ...deps,
          cache: {
            get: () => ({
              Memory,
              evaluation: cachedEval
            }),
            set: (_, { evaluation }) => {
              assert.equal(evaluation.gasUsed, 0)
            }
          },
          saveCheckpoint: async () => {
            checkpointSaved = true
          }
        }))
        await saveLatestProcessMemoryWithNoThreshold({ ...targetWithGasUsed, gasUsed: BigInt(150) })
        await new Promise(resolve => setTimeout(resolve, 100))

        assert.ok(checkpointSaved)
      })
    })
  })

  describe('createProcessMemoryCache', () => {
    const THIRTY_TWO_DAYS = 1000 * 60 * 60 * 24 * 30
    test('can set cache TTL greater than int32 max value without overflowing', async () => {
      const lt = (await import('long-timeout')).default
      let setTimeoutCalled = false
      let ttlRan = false
      let timeoutRef
      const cache = await createProcessMemoryCache({
        TTL: THIRTY_TWO_DAYS,
        MAX_SIZE: bytes('500mb'),
        setTimeout: (cb, time) => {
          setTimeoutCalled = true
          timeoutRef = lt.setTimeout(() => {
            ttlRan = true
            cb()
          }, time)
          return timeoutRef
        },
        clearTimeout: lt.clearTimeout,
        gauge: () => false
      })
      // call something on the cache
      cache.set('foo', { Memory: Buffer.from('hello world') })
      // wait to see that this implementation does not overflow
      await new Promise((resolve) => setTimeout(resolve, 50))

      assert.ok(setTimeoutCalled)
      assert.ok(!ttlRan)

      timeoutRef.unref()
    })
  })

  describe('saveCheckpointWith', () => {
    const logger = createTestLogger({ name: 'saveCheckpointWith' })
    const depsAll = {
      logger
    }

    describe('should create an arweave checkpoint and file checkpoint', async () => {
      const deps = {
        ...depsAll,
        queryGateway: () => Promise.resolve(),
        queryCheckpointGateway: () => Promise.resolve(),
        address: () => Promise.resolve(),
        hashWasmMemory: () => Promise.resolve('hash'),
        readProcessMemoryFile: async (file) => {
          assert.equal(file, 'file.dat')
          return Buffer.from([1, 2, 3])
        },
        uploadDataItem: (data) => Promise.resolve({ id: 'tx-123' }),
        buildAndSignDataItem: (...args) => Promise.resolve(...args),
        writeCheckpointRecord: (d) => Promise.resolve(),
        writeFileCheckpointMemory: ({ Memory, evaluation }) => {
          assert.ok(Memory)
          assert.equal(evaluation.processId, 'process-123')
          return Promise.resolve('file.dat')
        },
        writeFileCheckpointRecord: (_evaluation, file) => {
          assert.equal(file, 'file.dat')
          return Promise.resolve(file)
        },
        DISABLE_PROCESS_CHECKPOINT_CREATION: false,
        DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: false
      }

      test('when Memory is provided directly', async () => {
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          ...deps
        })

        const [fileCheckpointResult, arweaveCheckpointResult] = await saveCheckpoint({ Memory: Buffer.from('Memory'), moduleId: 'module-123', processId: 'process-123' })

        assert.equal(fileCheckpointResult.file, 'file.dat')
        assert.equal(arweaveCheckpointResult.id, 'tx-123')
      })

      test('when Memory is provided as a file', async () => {
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          ...deps
        })

        const [fileCheckpointResult, arweaveCheckpointResult] = await saveCheckpoint({ File: Promise.resolve('file.dat'), moduleId: 'module-123', processId: 'process-123' })

        assert.equal(fileCheckpointResult.file, 'file.dat')
        assert.equal(arweaveCheckpointResult.id, 'tx-123')
      })
    })

    test('should not save checkpoints if all checkpointing is disabled', async () => {
      const saveCheckpoint = saveCheckpointWith({
        ...depsAll,
        writeFileCheckpointMemory: async () => assert.fail('should not call if file checkpointing is disabled'),
        writeFileCheckpointRecord: async () => assert.fail('should not call if file checkpointing is disabled'),
        uploadDataItem: async () => assert.fail('shold not call if arweave checkpoints are disabled'),
        address: () => {
          assert.fail('saving checkpoint process should not have been initiated')
        },
        DISABLE_PROCESS_CHECKPOINT_CREATION: true,
        DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true
      })
      const res = await saveCheckpoint({ Memory: Buffer.from(['hello world']) })

      assert.ok(Array.isArray(res))

      const [fileCheckpointResult, arweaveCheckpointResults] = res
      assert.equal(fileCheckpointResult, undefined)
      assert.equal(arweaveCheckpointResults, undefined)
    })

    describe('arweave checkpoint', () => {
      test('should save a checkpoint to arweave and save to record checkpoint', async () => {
        let writeCheckpointRecordCalled = false
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          queryGateway: () => Promise.resolve(),
          queryCheckpointGateway: () => Promise.resolve(),
          address: () => Promise.resolve(),
          hashWasmMemory: () => Promise.resolve('hash'),
          readProcessMemoryFile: () => Promise.resolve(Buffer.from([1, 2, 3])),
          uploadDataItem: (data) => Promise.resolve({ id: 'tx-123' }),
          buildAndSignDataItem: (...args) => Promise.resolve(...args),
          writeCheckpointRecord: (d) => {
            writeCheckpointRecordCalled = true
            return Promise.resolve()
          },
          DISABLE_PROCESS_CHECKPOINT_CREATION: false,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true
        })
        const [, result] = await saveCheckpoint({ File: 'file', moduleId: 'module-123', processId: 'process-123' })
        assert.equal(result.id, 'tx-123')
        assert.ok(writeCheckpointRecordCalled)
      })

      test('should not create if arweave checkpoint was recently created', async () => {
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          address: () => {
            assert.fail('saving checkpoint process should not have been initiated')
          },
          DISABLE_PROCESS_CHECKPOINT_CREATION: false,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true,
          recentCheckpoints: new Map([['process-123', true]])
        })

        const [, arweaveCheckpointResults] = await saveCheckpoint({ Memory: Buffer.from('hello'), processId: 'process-123' })
        assert.equal(arweaveCheckpointResults, undefined)
      })

      test('should not create if checkpoint for evaluation already exists on Arweave', async () => {
        let writeCheckpointRecordCalled = false
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          address: () => {
            return Promise.resolve()
          },
          queryGateway: () => Promise.resolve({ data: { transactions: { edges: [{ node: { id: 'tx-123', tags: [] } }] } } }),
          queryCheckpointGateway: () => Promise.resolve({ data: { transactions: { edges: [{ node: { id: 'tx-123', tags: [] } }] } } }),
          readProcessMemoryFile: async () => Buffer.from('hello'),
          writeCheckpointRecord: (d) => {
            writeCheckpointRecordCalled = true
            return Promise.resolve()
          },
          DISABLE_PROCESS_CHECKPOINT_CREATION: false,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true
        })

        const [, result] = await saveCheckpoint({ File: Promise.resolve('file') })
        assert.equal(result.id, 'tx-123')
        assert.ok(writeCheckpointRecordCalled)
      })

      describe('should fail gracefully if memory is not provided directly or as as a file', async () => {
        const deps = {
          ...depsAll,
          address: () => {
            return Promise.resolve()
          },
          writeFileCheckpointMemory: async () => assert.fail('should not call if file checkpointing is disabled'),
          writeFileCheckpointRecord: async () => assert.fail('should not call if file checkpointing is disabled'),
          uploadDataItem: async () => assert.fail('shold not call if memory not provided'),
          queryGateway: async () => assert.fail('shold not call if memory not provided'),
          queryCheckpointGateway: async () => assert.fail('shold not call if memory not provided'),
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true,
          DISABLE_PROCESS_CHECKPOINT_CREATION: false
        }

        test('should fail if memory and file are both undefined', async () => {
          const saveCheckpoint = saveCheckpointWith({
            ...deps
          })
          await saveCheckpoint({})
            .then(() => assert.fail('should not resolve if no Memory or File is provided'))
            .catch(() => assert.ok(true))
        })

        test('should fail if file promise resolves with undefined', async () => {
          const saveCheckpoint = saveCheckpointWith({
            ...deps
          })
          await saveCheckpoint({ File: Promise.resolve(undefined) })
            .then(() => assert.fail('should not resolve if File resolves to undefined'))
            .catch(() => assert.ok(true))
        })
      })

      test('should fail gracefully if uploading to Arweave fails', async () => {
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          queryGateway: () => Promise.resolve(),
          queryCheckpointGateway: () => Promise.resolve(),
          address: () => Promise.resolve(),
          hashWasmMemory: () => Promise.resolve('hash'),
          readProcessMemoryFile: () => Promise.resolve(Buffer.from([1, 2, 3])),
          uploadDataItem: (data) => Promise.reject(new Error('oops')),
          buildAndSignDataItem: (...args) => Promise.resolve(...args),
          writeCheckpointRecord: (d) => assert.fail('should not call if upload to arweave fails'),
          DISABLE_PROCESS_CHECKPOINT_CREATION: false,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true
        })
        const [, result] = await saveCheckpoint({ File: 'file', moduleId: 'module-123', processId: 'process-123' })
        assert.equal(result, undefined)
      })

      test('should handle gracefully if fail to save record checkpoint', async () => {
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          queryGateway: () => Promise.resolve(),
          queryCheckpointGateway: () => Promise.resolve(),
          address: () => Promise.resolve(),
          hashWasmMemory: () => Promise.resolve('hash'),
          readProcessMemoryFile: () => Promise.resolve(Buffer.from([1, 2, 3])),
          uploadDataItem: (data) => Promise.resolve({ id: 'tx-123' }),
          buildAndSignDataItem: (...args) => Promise.resolve(...args),
          writeCheckpointRecord: (d) => Promise.reject(new Error('oops')),
          DISABLE_PROCESS_CHECKPOINT_CREATION: false,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: true
        })
        await saveCheckpoint({ File: 'file', moduleId: 'module-123', processId: 'process-123' })
      })
    })

    describe('file checkpoint', () => {
      test('should save a file checkpoint', async () => {
        const saveCheckpoint = saveCheckpointWith({
          ...depsAll,
          queryGateway: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          queryCheckpointGateway: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          address: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          hashWasmMemory: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          uploadDataItem: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          buildAndSignDataItem: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          writeCheckpointRecord: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          readProcessMemoryFile: () => undefined,
          writeFileCheckpointMemory: ({ Memory, evaluation }) => {
            assert.ok(Memory)
            assert.equal(evaluation.processId, 'process-123')
            return Promise.resolve('dir/file.dat')
          },
          writeFileCheckpointRecord: (_evaluation, file) => {
            assert.equal(file, 'dir/file.dat')
            return Promise.resolve(file)
          },
          DISABLE_PROCESS_CHECKPOINT_CREATION: true,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: false
        })
        const [result] = await saveCheckpoint({ Memory: Buffer.from('Memory'), moduleId: 'module-123', processId: 'process-123' })

        assert.equal(result.file, 'dir/file.dat')
      })

      describe('should fail gracefully if memory is not provided directly or as as a file', async () => {
        const deps = {
          ...depsAll,
          queryGateway: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          queryCheckpointGateway: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          address: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          hashWasmMemory: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          uploadDataItem: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          buildAndSignDataItem: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          writeCheckpointRecord: async () => assert.fail('should not call if arweave checkpoint is disabled'),
          readProcessMemoryFile: async () => assert.fail('should not call if failing gracefully'),
          writeFileCheckpointMemory: async () => assert.fail('should not call if failing gracefully'),
          writeFileCheckpointRecord: async () => assert.fail('should not call if failing gracefully'),
          DISABLE_PROCESS_CHECKPOINT_CREATION: true,
          DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: false
        }

        test('should fail if memory and file are both undefined', async () => {
          const saveCheckpoint = saveCheckpointWith({
            ...deps
          })
          await saveCheckpoint({})
            .then(() => assert.fail('should not resolve if no Memory or File is provided'))
            .catch(() => assert.ok(true))
        })

        test('should fail if file promise resolves with undefined', async () => {
          const saveCheckpoint = saveCheckpointWith({
            ...deps
          })
          await saveCheckpoint({ File: Promise.resolve(undefined) })
            .then(() => assert.fail('should not resolve if File resolves to undefined'))
            .catch(() => assert.ok(true))
        })
      })
    })
  })
})
