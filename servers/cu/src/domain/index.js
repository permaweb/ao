import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'

import Dataloader from 'dataloader'
import workerpool from 'workerpool'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

// Precanned clients to use for OOTB apis
import * as ArweaveClient from './client/arweave.js'
import * as PouchDbClient from './client/pouchdb.js'
import * as AoSuClient from './client/ao-su.js'
import * as WasmClient from './client/wasm.js'
import * as AoProcessClient from './client/ao-process.js'
import * as AoModuleClient from './client/ao-module.js'
import * as AoEvaluationClient from './client/ao-evaluation.js'
import * as AoBlockClient from './client/ao-block.js'

import { readResultWith } from './api/readResult.js'
import { readStateWith } from './api/readState.js'
import { readCronResultsWith } from './api/readCronResults.js'
import { healthcheckWith } from './api/healthcheck.js'
import { readResultsWith } from './api/readResults.js'
import { dryRunWith } from './api/dryRun.js'

export { createLogger } from './logger.js'
export { domainConfigSchema, positiveIntSchema } from './model.js'
export { errFrom } from './utils.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export const createApis = async (ctx) => {
  ctx.logger('Creating business logic apis')

  const { locate } = schedulerUtilsConnect({
    cacheSize: 100,
    GATEWAY_URL: ctx.GATEWAY_URL,
    followRedirects: true
  })
  const locateDataloader = new Dataloader(async (processIds) => {
    /**
     * locate already maintains a cache, so we'll just clear
     * the dataloader cache every time
     *
     * This way we get the benefits of batching and deduping built
     * into the dataloader api
     */
    locateDataloader.clearAll()
    return Promise.all(processIds.map(
      (processId) => locate(processId).catch(err => err)
    ))
  })

  const pouchDb = await PouchDbClient.createPouchDbClient({
    logger: ctx.logger,
    mode: ctx.DB_MODE,
    maxListeners: ctx.DB_MAX_LISTENERS,
    url: ctx.DB_URL
  })

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
            GATEWAY_URL: ctx.GATEWAY_URL,
            id: workerId
          }
        }
      }
    }
  })

  const arweave = ArweaveClient.createWalletClient()
  const address = ArweaveClient.addressWith({ WALLET: ctx.WALLET, arweave })

  ctx.logger('Process Snapshot creation is set to "%s"', !ctx.DISABLE_PROCESS_CHECKPOINT_CREATION)

  const saveCheckpoint = AoProcessClient.saveCheckpointWith({
    address,
    queryGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger: ctx.logger }),
    hashWasmMemory: WasmClient.hashWasmMemory,
    buildAndSignDataItem: ArweaveClient.buildAndSignDataItemWith({ WALLET: ctx.WALLET }),
    uploadDataItem: ArweaveClient.uploadDataItemWith({ UPLOADER_URL: ctx.UPLOADER_URL, fetch: ctx.fetch, logger: ctx.logger }),
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

  /**
   * TODO: determine a way to hoist this event listener to a dirtier level,
   * then simply call something like a "drainWasmMemoryCache()" api
   *
   * For now, just adding another listener
   */
  process.on('SIGTERM', () => {
    ctx.logger('Recevied SIGTERM. Attempting to Checkpoint all Processes currently in WASM heap cache...')
    wasmMemoryCache.lru.forEach((value) => {
      saveCheckpoint({ Memory: value.Memory, ...value.evaluation })
        .catch((err) => {
          ctx.logger(
            'Error occurred when creating Checkpoint for evaluation "%j". Skipping...',
            value.evaluation,
            err
          )
        })
    })
  })

  const sharedDeps = (logger) => ({
    loadTransactionMeta: ArweaveClient.loadTransactionMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
    loadTransactionData: ArweaveClient.loadTransactionDataWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
    findProcess: AoProcessClient.findProcessWith({ pouchDb, logger }),
    findProcessMemoryBefore: AoProcessClient.findProcessMemoryBeforeWith({
      cache: wasmMemoryCache,
      loadTransactionData: ArweaveClient.loadTransactionDataWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
      queryGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
      logger
    }),
    saveLatestProcessMemory: AoProcessClient.saveLatestProcessMemoryWith({ cache: wasmMemoryCache, logger }),
    saveProcess: AoProcessClient.saveProcessWith({ pouchDb, logger }),
    findEvaluation: AoEvaluationClient.findEvaluationWith({ pouchDb, logger }),
    saveEvaluation: AoEvaluationClient.saveEvaluationWith({ pouchDb, logger }),
    findBlocks: AoBlockClient.findBlocksWith({ pouchDb, logger }),
    saveBlocks: AoBlockClient.saveBlocksWith({ pouchDb, logger }),
    loadBlocksMeta: AoBlockClient.loadBlocksMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, pageSize: 90, logger }),
    findModule: AoModuleClient.findModuleWith({ pouchDb, logger }),
    saveModule: AoModuleClient.saveModuleWith({ pouchDb, logger }),
    loadEvaluator: AoModuleClient.evaluatorWith({
      /**
       * Evaluation will invoke a worker available in the worker pool
       */
      evaluate: (...args) => workerPool.exec('evaluate', args),
      logger
    }),
    findMessageHashBefore: AoEvaluationClient.findMessageHashBeforeWith({ pouchDb, logger }),
    loadTimestamp: AoSuClient.loadTimestampWith({ fetch: ctx.fetch, logger }),
    loadProcess: AoSuClient.loadProcessWith({ fetch: ctx.fetch, logger }),
    loadMessages: AoSuClient.loadMessagesWith({ fetch: ctx.fetch, pageSize: 1000, logger }),
    locateScheduler: locateDataloader.load.bind(locateDataloader),
    doesExceedModuleMaxMemory: WasmClient.doesExceedModuleMaxMemoryWith({ PROCESS_WASM_MEMORY_MAX_LIMIT: ctx.PROCESS_WASM_MEMORY_MAX_LIMIT }),
    doesExceedModuleMaxCompute: WasmClient.doesExceedModuleMaxComputeWith({ PROCESS_WASM_COMPUTE_MAX_LIMIT: ctx.PROCESS_WASM_COMPUTE_MAX_LIMIT }),
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
    findEvaluations: AoEvaluationClient.findEvaluationsWith({ pouchDb, logger: readCronResultsLogger })
  })

  const readResultsLogger = ctx.logger.child('readResults')
  const readResults = readResultsWith({
    ...sharedDeps(readResultsLogger),
    findEvaluations: AoEvaluationClient.findEvaluationsWith({ pouchDb, logger: readResultsLogger })
  })

  const healthcheck = healthcheckWith({ walletAddress: address })

  return { readState, dryRun, readResult, readResults, readCronResults, healthcheck }
}
