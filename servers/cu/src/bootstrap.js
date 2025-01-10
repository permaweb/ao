import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { writeFile, mkdir, rename as renameFile } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { BroadcastChannel } from 'node:worker_threads'

import pMap from 'p-map'
import PQueue from 'p-queue'
import Dataloader from 'dataloader'
import workerpool from 'workerpool'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'
import { fromPromise } from 'hyper-async'
import lt from 'long-timeout'

// Precanned clients to use for OOTB apis
import * as DbClient from './effects/db.js'
import * as ArweaveClient from './effects/arweave.js'
import * as AoSuClient from './effects/ao-su.js'
import * as WasmClient from './effects/wasm.js'
import * as AoProcessClient from './effects/ao-process.js'
import * as AoModuleClient from './effects/ao-module.js'
import * as AoEvaluationClient from './effects/ao-evaluation.js'
import * as AoBlockClient from './effects/ao-block.js'
import * as MetricsClient from './effects/metrics.js'

import { readResultWith } from './domain/api/readResult.js'
import { readStateWith, pendingReadStates } from './domain/api/readState.js'
import { readCronResultsWith } from './domain/api/readCronResults.js'
import { healthcheckWith } from './domain/api/healthcheck.js'
import { readResultsWith } from './domain/api/readResults.js'
import { dryRunWith } from './domain/api/dryRun.js'
import { statsWith } from './domain/api/perf.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

/**
 * readFile from NodeJS has a limit of 2GB.
 *
 * Since we may need to read files larger than this,
 * we create simple wrapper around createReadStream
 * that provides the same api as readFile
 */
async function readFile (file) {
  const stream = createReadStream(file)

  const chunks = []
  for await (const chunk of stream) chunks.push(chunk)

  return Buffer.concat(chunks)
}

export const createApis = async (ctx) => {
  ctx.logger('Creating business logic apis')

  const setTimeout = (...args) => lt.setTimeout(...args)
  const clearTimeout = (...args) => lt.clearTimeout(...args)

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

  const db = await DbClient.createDbClient({ url: ctx.DB_URL, bootstrap: true })

  const BROADCAST = 'workers'
  const workerBroadcast = new BroadcastChannel(BROADCAST).unref()
  const broadcastCloseStream = (streamId) => workerBroadcast.postMessage({ type: 'close-stream', streamId })

  const onCreateWorker = (type) => () => {
    const workerId = randomBytes(8).toString('hex')
    ctx.logger('Spinning up "%s" pool worker with id "%s"...', type, workerId)

    return {
      workerThreadOpts: {
        workerData: {
          BROADCAST,
          WASM_MODULE_CACHE_MAX_SIZE: ctx.WASM_MODULE_CACHE_MAX_SIZE,
          WASM_INSTANCE_CACHE_MAX_SIZE: ctx.WASM_INSTANCE_CACHE_MAX_SIZE,
          WASM_BINARY_FILE_DIRECTORY: ctx.WASM_BINARY_FILE_DIRECTORY,
          ARWEAVE_URL: ctx.ARWEAVE_URL,
          GRAPHQL_URL: ctx.GRAPHQL_URL,
          CHECKPOINT_GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL,
          DB_URL: ctx.DB_URL,
          id: workerId,
          MODE: ctx.MODE,
          LOG_CONFIG_PATH: ctx.LOG_CONFIG_PATH,
          DEFAULT_LOG_LEVEL: ctx.DEFAULT_LOG_LEVEL,
          DISABLE_PROCESS_EVALUATION_CACHE: ctx.DISABLE_PROCESS_EVALUATION_CACHE
        }
      }
    }
  }

  /**
   * Some of the work performed, in prep for sending the task to the worker thread pool,
   * ie. copying the process memory so that each eval stream may have their own memory
   * to pass back and forth (see below), can be resource intensive.
   *
   * If the thread pool is fully utilized, the pool will start to queue tasks sent to it on the main-thread.
   * Subsequently, the amount of time between when the "prep-work" and
   * the "actual evaluation work" are performed can grow very large.
   *
   * This effectively produces a "front-loading" effect, where all the "prep-work" is ran
   * all up front, then queued for a worker to eventually take on the actual work.
   *
   * In other words, resource intensive data strucutres ie. process memory can just be
   * sitting queued for long periods of time, waiting for an available worker thread. We need to mitigate this.
   *
   * So for each worker thread pool, we utilize a queue with matching concurrency as the thread pool,
   * which will defer performing the "prep-work" until right before a worker is available to perform the "actual work",
   * ergo eliminating the "front-loading" effect.
   *
   * (see pQueue instantitations below)
   */

  const maxPrimaryWorkerThreads = Math.min(
    Math.max(1, ctx.WASM_EVALUATION_MAX_WORKERS - 1),
    Math.ceil(ctx.WASM_EVALUATION_MAX_WORKERS * (ctx.WASM_EVALUATION_PRIMARY_WORKERS_PERCENTAGE / 100))
  )

  const worker = join(__dirname, 'effects', 'worker', 'evaluator', 'index.js')
  const primaryWorkerPool = workerpool.pool(worker, {
    maxWorkers: maxPrimaryWorkerThreads,
    onCreateWorker: onCreateWorker('primary')
  })
  const primaryWorkQueue = new PQueue({ concurrency: maxPrimaryWorkerThreads })

  const maxDryRunWorkerTheads = Math.max(
    1,
    Math.floor(ctx.WASM_EVALUATION_MAX_WORKERS * (1 - (ctx.WASM_EVALUATION_PRIMARY_WORKERS_PERCENTAGE / 100)))
  )
  const dryRunWorkerPool = workerpool.pool(worker, {
    maxWorkers: maxDryRunWorkerTheads,
    onCreateWorker: onCreateWorker('dry-run'),
    maxQueueSize: ctx.WASM_EVALUATION_WORKERS_DRY_RUN_MAX_QUEUE
  })
  const dryRunWorkQueue = new PQueue({ concurrency: maxDryRunWorkerTheads })

  const arweave = ArweaveClient.createWalletClient()
  const address = ArweaveClient.addressWith({ WALLET: ctx.WALLET, arweave })

  /**
   * TODO: I don't really like implictly doing this,
   * but works for now.
   */
  const _metrics = MetricsClient.initializeRuntimeMetricsWith({})()

  const gauge = MetricsClient.gaugeWith({})

  const readProcessMemoryFile = AoProcessClient.readProcessMemoryFileWith({
    DIR: ctx.PROCESS_MEMORY_CACHE_FILE_DIR,
    readFile
  })

  const readFileCheckpointMemory = AoProcessClient.readProcessMemoryFileWith({
    readFile,
    DIR: ctx.PROCESS_MEMORY_FILE_CHECKPOINTS_DIR
  })

  const writeProcessMemoryFile = AoProcessClient.writeProcessMemoryFileWith({
    DIR: ctx.PROCESS_MEMORY_CACHE_FILE_DIR,
    writeFile,
    renameFile,
    mkdir
  })

  const writeFileCheckpointMemory = AoProcessClient.writeProcessMemoryFileWith({
    /**
     * Using separate files between the LRU cache and file checkpoints prevents
     * race conditions that arise from using the same physical file, meaning that
     * the LRU cache and SQLite do not have to be kept in sync.
     *
     * This also reduces SQLite write operations due to LRU Caches that are constantly
     * draining to files.
     *
     * In other words, file checkpoints only _need_ to be created/updated on shutdown
     */
    DIR: ctx.PROCESS_MEMORY_FILE_CHECKPOINTS_DIR,
    writeFile,
    renameFile,
    mkdir
  })

  ctx.logger('Process Arweave Checkpoint creation is set to "%s"', !ctx.DISABLE_PROCESS_CHECKPOINT_CREATION)
  ctx.logger('Process File Checkpoint creation is set to "%s"', !ctx.DISABLE_PROCESS_FILE_CHECKPOINT_CREATION)
  ctx.logger('Ignoring Arweave Checkpoints for processes [ %s ]', ctx.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS.join(', '))
  ctx.logger('Ignoring Arweave Checkpoints [ %s ]', ctx.IGNORE_ARWEAVE_CHECKPOINTS.join(', '))
  ctx.logger('Trusting Arweave Checkpoint Owners [ %s ]', ctx.PROCESS_CHECKPOINT_TRUSTED_OWNERS.join(', '))
  ctx.logger('Allowing only process owners [ %s ]', ctx.ALLOW_OWNERS.join(', '))
  ctx.logger('Restricting processes [ %s ]', ctx.RESTRICT_PROCESSES.join(', '))
  ctx.logger('Allowing only processes [ %s ]', ctx.ALLOW_PROCESSES.join(', '))
  ctx.logger('Max worker threads set to %s', ctx.WASM_EVALUATION_MAX_WORKERS)
  ctx.logger('Max primary worker threads set to %s', maxPrimaryWorkerThreads)
  ctx.logger('Max dry-run worker threads set to %s', maxDryRunWorkerTheads)
  ctx.logger('Max dry-run worker thread pool queue size set to %s', ctx.WASM_EVALUATION_WORKERS_DRY_RUN_MAX_QUEUE)

  const saveCheckpoint = AoProcessClient.saveCheckpointWith({
    address,
    readProcessMemoryFile,
    queryGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger: ctx.logger }),
    queryCheckpointGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL, logger: ctx.logger }),
    hashWasmMemory: WasmClient.hashWasmMemoryWith({ logger: ctx.logger }),
    buildAndSignDataItem: ArweaveClient.buildAndSignDataItemWith({ WALLET: ctx.WALLET }),
    uploadDataItem: ArweaveClient.uploadDataItemWith({ UPLOADER_URL: ctx.UPLOADER_URL, fetch: ctx.fetch, logger: ctx.logger }),
    writeCheckpointRecord: AoProcessClient.writeCheckpointRecordWith({ db }),
    writeFileCheckpointMemory,
    writeFileCheckpointRecord: AoProcessClient.writeFileCheckpointRecordWith({ db }),
    logger: ctx.logger,
    DISABLE_PROCESS_CHECKPOINT_CREATION: ctx.DISABLE_PROCESS_CHECKPOINT_CREATION,
    DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: ctx.DISABLE_PROCESS_FILE_CHECKPOINT_CREATION,
    PROCESS_CHECKPOINT_CREATION_THROTTLE: ctx.PROCESS_CHECKPOINT_CREATION_THROTTLE,
    PROCESS_MEMORY_FILE_CHECKPOINTS_DIR: ctx.PROCESS_MEMORY_FILE_CHECKPOINTS_DIR
  })

  const wasmMemoryCache = await AoProcessClient.createProcessMemoryCache({
    gauge,
    MAX_SIZE: ctx.PROCESS_MEMORY_CACHE_MAX_SIZE,
    TTL: ctx.PROCESS_MEMORY_CACHE_TTL,
    writeProcessMemoryFile,
    logger: ctx.logger,
    setTimeout,
    clearTimeout
  })

  const loadWasmModule = WasmClient.loadWasmModuleWith({
    fetch: ctx.fetch,
    ARWEAVE_URL: ctx.ARWEAVE_URL,
    WASM_BINARY_FILE_DIRECTORY: ctx.WASM_BINARY_FILE_DIRECTORY,
    logger: ctx.logger,
    cache: WasmClient.createWasmModuleCache({ MAX_SIZE: ctx.WASM_MODULE_CACHE_MAX_SIZE })
  })

  const stats = statsWith({
    gauge,
    loadWorkerStats: () => ({
      primary: ({
        ...primaryWorkerPool.stats(),
        /**
         * We use a work queue on the main thread while keeping
         * worker pool queues empty (see comment above)
         *
         * So we use the work queue size to report pending tasks
         */
        pendingTasks: primaryWorkQueue.size
      }),
      dryRun: ({
        ...dryRunWorkerPool.stats(),
        /**
         * We use a work queue on the main thread while keeping
         * worker pool queues empty (see comment above)
         *
         * So we use the work queue size to report pending tasks
         */
        pendingTasks: dryRunWorkQueue.size
      })
    }),
    /**
     * https://nodejs.org/api/process.html#processmemoryusage
     *
     * Note: worker thread resources will be included in rss,
     * as that is the Resident Set Size for the entire node process
     */
    loadMemoryUsage: () => process.memoryUsage(),
    loadProcessCacheUsage: () => wasmMemoryCache.data.loadProcessCacheUsage()
  })
  /**
   * TODO: Should this just be a field on stats to call?
   */
  const metrics = {
    contentType: _metrics.contentType,
    compute: fromPromise(() => _metrics.metrics())
  }

  const evaluationCounter = MetricsClient.counterWith({})({
    name: 'ao_process_total_evaluations',
    description: 'The total number of evaluations on a CU',
    labelNames: ['stream_type', 'message_type', 'process_error']
  })

  const pendingEvaluationCounter = MetricsClient.counterWith({})({
    name: 'ao_process_pending_evaluations',
    description: 'The total number of pending evaluations on a CU',
    labelNames: ['type']
  })

  pendingEvaluationCounter.set({ type: 'primary' }, primaryWorkQueue.size)
  pendingEvaluationCounter.set({ type: 'dry-run' }, dryRunWorkQueue.size)

  /**
   * TODO: Gas can grow to a huge number. We need to make sure this doesn't crash when that happens
   */
  // const gasCounter = MetricsClient.counterWith({})({
  //   name: 'total_gas_used',
  //   description: 'The total number of gas used on a CU',
  //   labelNames: ['processId', 'cron', 'dryRun', 'error']
  // })

  const sharedDeps = (logger) => ({
    loadTransactionMeta: ArweaveClient.loadTransactionMetaWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger }),
    loadTransactionData: ArweaveClient.loadTransactionDataWith({ fetch: ctx.fetch, ARWEAVE_URL: ctx.ARWEAVE_URL, logger }),
    isProcessOwnerSupported: AoProcessClient.isProcessOwnerSupportedWith({ ALLOW_OWNERS: ctx.ALLOW_OWNERS }),
    findProcess: AoProcessClient.findProcessWith({ db, logger }),
    findLatestProcessMemory: AoProcessClient.findLatestProcessMemoryWith({
      cache: wasmMemoryCache,
      loadTransactionData: ArweaveClient.loadTransactionDataWith({ fetch: ctx.fetch, ARWEAVE_URL: ctx.ARWEAVE_URL, logger }),
      readProcessMemoryFile,
      readFileCheckpointMemory,
      findFileCheckpointBefore: AoProcessClient.findFileCheckpointBeforeWith({ db }),
      findRecordCheckpointBefore: AoProcessClient.findRecordCheckpointBeforeWith({ db }),
      address,
      queryGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, logger }),
      queryCheckpointGateway: ArweaveClient.queryGatewayWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.CHECKPOINT_GRAPHQL_URL, logger }),
      PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: ctx.PROCESS_IGNORE_ARWEAVE_CHECKPOINTS,
      IGNORE_ARWEAVE_CHECKPOINTS: ctx.IGNORE_ARWEAVE_CHECKPOINTS,
      PROCESS_CHECKPOINT_TRUSTED_OWNERS: ctx.PROCESS_CHECKPOINT_TRUSTED_OWNERS,
      logger
    }),
    saveLatestProcessMemory: AoProcessClient.saveLatestProcessMemoryWith({
      cache: wasmMemoryCache,
      EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD: ctx.EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD,
      saveCheckpoint,
      logger
    }),
    evaluationCounter,
    // gasCounter,
    saveProcess: AoProcessClient.saveProcessWith({ db, logger }),
    findEvaluation: AoEvaluationClient.findEvaluationWith({ db, logger }),
    saveEvaluation: AoEvaluationClient.saveEvaluationWith({ db, logger }),
    findBlocks: AoBlockClient.findBlocksWith({ db, logger }),
    saveBlocks: AoBlockClient.saveBlocksWith({ db, logger }),
    loadBlocksMeta: AoBlockClient.loadBlocksMetaWith({ fetch: ctx.fetch, GRAPHQL_URL: ctx.GRAPHQL_URL, pageSize: 90, logger }),
    findModule: AoModuleClient.findModuleWith({ db, logger }),
    saveModule: AoModuleClient.saveModuleWith({ db, logger }),
    loadEvaluator: AoModuleClient.evaluatorWith({
      loadWasmModule,
      evaluateWith: (prep) => primaryWorkQueue.add(() =>
        Promise.resolve()
          /**
           * prep work is deferred until the work queue tasks is executed
           */
          .then(prep)
          .then(([args, options]) => {
            /**
             * TODO: is this the best place for this?
             *
             * It keeps it abstracted away from business logic,
             * and tied to the specific evaluator, so seems kosher,
             * but also feels kind of misplaced
             */
            if (args.close) return broadcastCloseStream(args.streamId)

            return primaryWorkerPool.exec('evaluate', [args], options)
          })
      ),
      logger
    }),
    findMessageBefore: AoEvaluationClient.findMessageBeforeWith({ db, logger }),
    loadTimestamp: AoSuClient.loadTimestampWith({ fetch: ctx.fetch, logger }),
    loadProcess: AoSuClient.loadProcessWith({ fetch: ctx.fetch, logger }),
    loadMessages: AoSuClient.loadMessagesWith({ fetch: ctx.fetch, pageSize: 1000, logger }),
    locateProcess: locateDataloader.load.bind(locateDataloader),
    isModuleMemoryLimitSupported: WasmClient.isModuleMemoryLimitSupportedWith({ PROCESS_WASM_MEMORY_MAX_LIMIT: ctx.PROCESS_WASM_MEMORY_MAX_LIMIT }),
    isModuleComputeLimitSupported: WasmClient.isModuleComputeLimitSupportedWith({ PROCESS_WASM_COMPUTE_MAX_LIMIT: ctx.PROCESS_WASM_COMPUTE_MAX_LIMIT }),
    isModuleFormatSupported: WasmClient.isModuleFormatSupportedWith({ PROCESS_WASM_SUPPORTED_FORMATS: ctx.PROCESS_WASM_SUPPORTED_FORMATS }),
    isModuleExtensionSupported: WasmClient.isModuleExtensionSupportedWith({ PROCESS_WASM_SUPPORTED_EXTENSIONS: ctx.PROCESS_WASM_SUPPORTED_EXTENSIONS }),
    MODULE_MODE: ctx.MODULE_MODE,
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
    setTimeout,
    clearTimeout,
    loadMessageMeta: AoSuClient.loadMessageMetaWith({ fetch: ctx.fetch, logger: dryRunLogger }),
    /**
     * Dry-runs use a separate worker thread pool, so as to not block
     * primary evaluations
     */
    loadDryRunEvaluator: AoModuleClient.evaluatorWith({
      loadWasmModule,
      evaluateWith: (prep) => dryRunWorkQueue.add(() =>
        Promise.resolve()
          /**
           * prep work is deferred until the work queue tasks is executed
           */
          .then(prep)
          .then(([args, options]) =>
            Promise.resolve()
              .then(() => {
                /**
                 * TODO: is this the best place for this?
                 *
                 * It keeps it abstracted away from business logic,
                 * and tied to the specific evaluator, so seems kosher,
                 * but also feels kind of misplaced
                 */
                if (args.close) return broadcastCloseStream(args.streamId)

                return dryRunWorkerPool.exec('evaluate', [args], options)
              })
              .catch((err) => {
                /**
                 * Hack to detect when the max queue size is being exceeded and to reject
                 * with a more informative error
                 */
                if (err.message.startsWith('Max queue size of')) {
                  const dryRunLimitErr = new Error('Dry-Run enqueue limit exceeded')
                  dryRunLimitErr.status = 429
                  return Promise.reject(dryRunLimitErr)
                }

                // Bubble as normal
                return Promise.reject(err)
              })
          )
      ),
      logger: dryRunLogger
    })
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
    findEvaluations: AoEvaluationClient.findEvaluationsWith({ db, logger: readCronResultsLogger })
  })

  const readResultsLogger = ctx.logger.child('readResults')
  const readResults = readResultsWith({
    ...sharedDeps(readResultsLogger),
    findEvaluations: AoEvaluationClient.findEvaluationsWith({ db, logger: readResultsLogger })
  })

  let checkpointP
  const checkpointWasmMemoryCache = fromPromise(async () => {
    if (checkpointP) {
      ctx.logger('Checkpointing of WASM Memory Cache already in progress. Nooping...')
      return checkpointP
    }

    const pArgs = []
    /**
     * push a new object to keep references to original data intact
     */
    wasmMemoryCache.data.forEach((value) =>
      pArgs.push({ Memory: value.Memory, File: value.File, evaluation: value.evaluation })
    )

    checkpointP = pMap(
      pArgs,
      (value) => saveCheckpoint({ Memory: value.Memory, File: value.File, ...value.evaluation })
        .catch((err) => {
          ctx.logger(
            'Error occurred when creating Checkpoint for evaluation "%j". Skipping...',
            value.evaluation,
            err
          )
        }),
      {
        /**
         * TODO: allow to be configured on CU
         *
         * Helps prevent the gateway from being overwhelmed and then timing out
         */
        concurrency: 10,
        /**
         * Prevent any one rejected promise from causing other invocations
         * to not be attempted.
         *
         * The overall promise will still reject, which is why we have
         * an empty catch below, which will allow all Promises to either resolve,
         * or reject, then the final wrapping promise to always resolve.
         *
         * https://github.com/sindresorhus/p-map?tab=readme-ov-file#stoponerror
         */
        stopOnError: false
      }
    )
      .catch(() => {})

    await checkpointP
    checkpointP = undefined
  })

  const healthcheck = healthcheckWith({ walletAddress: address })

  return { metrics, stats, pendingReadStates, readState, dryRun, readResult, readResults, readCronResults, checkpointWasmMemoryCache, healthcheck }
}
