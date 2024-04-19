import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'

import Dataloader from 'dataloader'
import fastGlob from 'fast-glob'
import workerpool from 'workerpool'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'
import { fromPromise } from 'hyper-async'

// Precanned clients to use for OOTB apis
import * as ArweaveClient from './client/arweave.js'
import * as SqliteClient from './client/sqlite.js'
import * as AoSuClient from './client/ao-su.js'
import * as WasmClient from './client/wasm.js'
import * as AoProcessClient from './client/ao-process.js'
import * as AoModuleClient from './client/ao-module.js'
import * as AoEvaluationClient from './client/ao-evaluation.js'
import * as AoBlockClient from './client/ao-block.js'

import { readResultWith } from './api/readResult.js'
import { readStateWith, pendingReadStates } from './api/readState.js'
import { readCronResultsWith } from './api/readCronResults.js'
import { healthcheckWith } from './api/healthcheck.js'
import { readResultsWith } from './api/readResults.js'
import { dryRunWith } from './api/dryRun.js'
import { statsWith } from './api/perf.js'

export { createLogger } from './logger.js'
export { domainConfigSchema, positiveIntSchema } from './model.js'
export { errFrom } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const createApis = async (ctx) => {
  ctx.logger('Creating business logic apis')

  const { locate } = schedulerUtilsConnect({
    cacheSize: 100,
    GRAPHQL_URL: ctx.GRAPHQL_URL,
    followRedirects: true
  })
  const locateDataloader = new Dataloader(async (params) => {
    /**
     * locate already maintains a cache, so we'll just clear
     * the dataloader cache every time
     *
     * This way we get the benefits of batching and deduping built
     * into the dataloader api
     */
    locateDataloader.clearAll()
    return Promise.all(params.map(
      ({ processId, schedulerHint }) => locate(processId, schedulerHint).catch(err => err)
    ))
  }, {
    cacheKeyFn: ({ processId }) => processId
  })

  const DB_URL = `${ctx.DB_URL}.sqlite`
  const sqlite = await SqliteClient.createSqliteClient({ url: DB_URL, bootstrap: true })

  const workerPool = workerpool.pool(join(__dirname, 'client', 'worker.js'), {
    maxWorkers: ctx.WASM_EVALUATION_MAX_WORKERS,
    onCreateWorker: () => {
      const workerId = randomBytes(8).toString('hex')
      ctx.logger('Spinning up worker with id "%s"...', workerId)

      return {
        workerThreadOpts: {
          workerData: {
            WASM_MODULE_CACHE_MAX_SIZE: ctx.WASM_MODULE_CACHE_MAX_SIZE,
            WASM_INSTANCE_CACHE_MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE,
            WASM_BINARY_FILE_DIRECTORY: ctx.WASM_BINARY_FILE_DIRECTORY,
            ARWEAVE_URL: ctx.ARWEAVE_URL,
            DB_URL,
            id: workerId
          }
        }
      }
    }
  })

  const arweave = ArweaveClient.createWalletClient()
  const address = ArweaveClient.addressWith({ WALLET: ctx.WALLET, arweave })

  ctx.logger('Process Snapshot creation is set to "%s"', !ctx.DISABLE_PROCESS_CHECKPOINT_CREATION)
  ctx.logger('Ignoring Arweave Checkpoints for processes [ %s ]', ctx.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.join(', '))
  ctx.logger('Restricting processes [ %s ]', ctx.RESTRICT_PROCESSES.join(', '))
  ctx.logger('Allowing only processes [ %s ]', ctx.ALLOW_PROCESSES.join(', '))
  ctx.logger('Max worker threads set to %s', ctx.WASM_EVALUATION_MAX_WORKERS)

  const stats = statsWith({
    loadWorkerStats: () => workerPool.stats(),
    /**
     * https://nodejs.org/api/process.html#processmemoryusage
     *
     * Note: worker thread resources will be included in rss,
     * as that is the Resident Set Size for the entire node process
     */
    loadMemoryUsage: () => process.memoryUsage(),
    loadProcessCacheUsage: () => AoProcessClient.loadProcessCacheUsage()
  })

  const saveCheckpoint = AoProcessClient.saveCheckpointWith({
    address,
    queryGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger: ctx.logger }),
    queryCheckpointGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL, logger: ctx.logger }),
    hashWasmMemory: WasmClient.hashWasmMemory,
    buildAndSignDataItem: ArweaveClient.buildAndSignDataItemWith({ WALLET: ctx.WALLET }),
    uploadDataItem: ArweaveClient.uploadDataItemWith({ UPLOADER_URL: ctx.UPLOADER_URL, fetch: ctx.fetch, logger: ctx.logger }),
    writeCheckpointFile: AoProcessClient.writeCheckpointFileWith({
      DIR: ctx.PROCESS_CHECKPOINT_FILE_DIRECTORY,
      writeFile
    }),
    logger: ctx.logger,
    DISABLE_PROCESS_CHECKPOINT_CREATION: ctx.DISABLE_PROCESS_CHECKPOINT_CREATION,
    PROCESS_CHECKPOINT_CREATION_THROTTLE: ctx.PROCESS_CHECKPOINT_CREATION_THROTTLE
  })

  const wasmMemoryCache = await AoProcessClient.createProcessMemoryCache({
    MAX_SIZE: ctx.PROCESS_MEMORY_CACHE_MAX_SIZE,
    TTL: ctx.PROCESS_MEMORY_CACHE_TTL,
    /**
     * Save the evicted process memory as a Checkpoint on Arweave
     */
    onEviction: ({ value }) =>
      saveCheckpoint({ Memory: value.Memory, ...value.evaluation })
        .catch((err) => {
          ctx.logger(
            'Error occurred when creating Checkpoint for evaluation "%j". Skipping...',
            value.evaluation,
            err
          )
        })
  })

  const sharedDeps = (logger) => ({
    loadTransactionMeta: ArweaveClient.loadTransactionMetaWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger }),
    loadTransactionData: ArweaveClient.loadTransactionDataWith({ fetch: ctx.fetch, ARWEAVE_URL: ctx.ARWEAVE_URL, logger }),
    findProcess: AoProcessClient.findProcessWith({ db: sqlite, logger }),
    findProcessMemoryBefore: AoProcessClient.findProcessMemoryBeforeWith({
      cache: wasmMemoryCache,
      loadTransactionData: ArweaveClient.loadTransactionDataWith({ fetch: ctx.fetch, ARWEAVE_URL: ctx.ARWEAVE_URL, logger }),
      findCheckpointFileBefore: AoProcessClient.findCheckpointFileBeforeWith({
        DIR: ctx.PROCESS_CHECKPOINT_FILE_DIRECTORY,
        glob: fastGlob
      }),
      readCheckpointFile: AoProcessClient.readCheckpointFileWith({
        DIR: ctx.PROCESS_CHECKPOINT_FILE_DIRECTORY,
        readFile
      }),
      address,
      queryGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger }),
      queryCheckpointGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL, logger }),
      PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: ctx.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
      logger
    }),
    saveLatestProcessMemory: AoProcessClient.saveLatestProcessMemoryWith({
      cache: wasmMemoryCache,
      EAGER_CHECKPOINT_THRESHOLD: ctx.EAGER_CHECKPOINT_THRESHOLD,
      saveCheckpoint,
      logger
    }),
    saveProcess: AoProcessClient.saveProcessWith({ db: sqlite, logger }),
    findEvaluation: AoEvaluationClient.findEvaluationWith({ db: sqlite, logger }),
    saveEvaluation: AoEvaluationClient.saveEvaluationWith({ db: sqlite, logger }),
    findBlocks: AoBlockClient.findBlocksWith({ db: sqlite, logger }),
    saveBlocks: AoBlockClient.saveBlocksWith({ db: sqlite, logger }),
    loadBlocksMeta: AoBlockClient.loadBlocksMetaWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, pageSize: 90, logger }),
    findModule: AoModuleClient.findModuleWith({ db: sqlite, logger }),
    saveModule: AoModuleClient.saveModuleWith({ db: sqlite, logger }),
    loadEvaluator: AoModuleClient.evaluatorWith({
      /**
       * Evaluation will invoke a worker available in the worker pool
       */
      evaluate: (...args) => workerPool.exec('evaluate', args),
      logger
    }),
    findMessageBefore: AoEvaluationClient.findMessageBeforeWith({ db: sqlite, logger }),
    loadTimestamp: AoSuClient.loadTimestampWith({ fetch: ctx.fetch, logger }),
    loadProcess: AoSuClient.loadProcessWith({ fetch: ctx.fetch, logger }),
    loadMessages: AoSuClient.loadMessagesWith({ fetch: ctx.fetch, pageSize: 1000, logger }),
    locateProcess: locateDataloader.load.bind(locateDataloader),
    isModuleMemoryLimitSupported: WasmClient.isModuleMemoryLimitSupportedWith({ PROCESS_WASM_MEMORY_MAX_LIMIT: ctx.PROCESS_WASM_MEMORY_MAX_LIMIT }),
    isModuleComputeLimitSupported: WasmClient.isModuleComputeLimitSupportedWith({ PROCESS_WASM_COMPUTE_MAX_LIMIT: ctx.PROCESS_WASM_COMPUTE_MAX_LIMIT }),
    isModuleFormatSupported: WasmClient.isModuleFormatSupportedWith(),
    /**
     * This is not configurable, as Load message support will be dictated by the protocol,
     * which proposes Assignments as a more flexible and extensible solution that also includes
     * Load Message use-cases
     *
     * But for now, supporting Load messages in perpetuity.
     */
    AO_LOAD_MAX_BLOCK: Number.MAX_SAFE_INTEGER,
    logger
  })
  /**
   * default readState that works OOTB
   * - Uses PouchDB to cache evaluations and processes
   * - Uses ao Sequencer Unit
   * - Use arweave.net gateway
   */
  const readStateLogger = ctx.logger.child('readState')
  const readState = readStateWith(sharedDeps(readStateLogger))

  const dryRunLogger = ctx.logger.child('dryRun')
  const dryRun = dryRunWith({
    ...sharedDeps(dryRunLogger),
    loadMessageMeta: AoSuClient.loadMessageMetaWith({ fetch: ctx.fetch, logger: dryRunLogger })
  })

  /**
   * default readResult that works OOTB
   * - Uses PouchDB to cache evaluations and processes
   * - Uses ao Sequencer Unit
   * - Use arweave.net gateway
   */
  const readResultLogger = ctx.logger.child('readResult')
  const readResult = readResultWith({
    ...sharedDeps(readResultLogger),
    loadMessageMeta: AoSuClient.loadMessageMetaWith({ fetch: ctx.fetch, logger: readResultLogger })
  })

  const readCronResultsLogger = ctx.logger.child('readCronResults')
  const readCronResults = readCronResultsWith({
    ...sharedDeps(readCronResultsLogger),
    findEvaluations: AoEvaluationClient.findEvaluationsWith({ db: sqlite, logger: readCronResultsLogger })
  })

  const readResultsLogger = ctx.logger.child('readResults')
  const readResults = readResultsWith({
    ...sharedDeps(readResultsLogger),
    findEvaluations: AoEvaluationClient.findEvaluationsWith({ db: sqlite, logger: readResultsLogger })
  })

  const checkpointWasmMemoryCache = fromPromise(async () => {
    const promises = []
    wasmMemoryCache.lru.forEach((value) => {
      promises.push(
        saveCheckpoint({ Memory: value.Memory, ...value.evaluation })
          .catch((err) => {
            ctx.logger(
              'Error occurred when creating Checkpoint for evaluation "%j". Skipping...',
              value.evaluation,
              err
            )
          })
      )
    })
    await Promise.allSettled(promises)
  })

  const healthcheck = healthcheckWith({ walletAddress: address })

  return { stats, pendingReadStates, readState, dryRun, readResult, readResults, readCronResults, checkpointWasmMemoryCache, healthcheck }
}
