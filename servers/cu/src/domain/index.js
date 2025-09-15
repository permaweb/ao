import { fromPromise } from 'hyper-async'

import { applicationSchema } from './dal.js'
import { domainConfigSchema } from './model.js'

import { readResultWith } from './api/readResult.js'
import { readStateWith, pendingReadStates } from './api/readState.js'
import { readCronResultsWith } from './api/readCronResults.js'
import { healthcheckWith } from './api/healthcheck.js'
import { readResultsWith } from './api/readResults.js'
import { dryRunWith } from './api/dryRun.js'
import { statsWith } from './api/perf.js'
import { forceSnapshotWith } from './api/forceSnapshot.js'
import { readStateFromCheckpointWith } from './api/readStateFromCheckpoint.js'

export const bootstrap = async ({ config, effects }) => {
  const logger = effects.logger

  logger('Creating business logic apis')

  const domainConfig = domainConfigSchema.parse(config)

  const commonDeps = (logger) => ({
    /**
     * TODO: not sure if I like this or not, having a 'common'
     * set of effects. For now, keeping to reduce deltas in the rejig
     * to full ports and adapters.
     */
    ...effects.common(logger),
    MODULE_MODE: domainConfig.MODULE_MODE,
    logger
  })

  const stats = statsWith({
    gauge: effects.gauge,
    loadWorkerStats: effects.loadWorkerStats,
    loadMemoryUsage: effects.loadMemoryUsage,
    loadProcessCacheUsage: effects.loadProcessCacheUsage
  })

  /**
   * TODO: Should this just be a field on stats to call?
   */
  const metrics = {
    contentType: effects.metrics.contentType,
    compute: fromPromise(() => effects.metrics.metrics())
  }

  const readStateLogger = logger.child('readState')
  const readState = readStateWith(commonDeps(readStateLogger))

  const readStateFromCheckpointLogger = logger.child('readStateFromCheckpoint')
  const readStateFromCheckpoint = readStateFromCheckpointWith(commonDeps(readStateFromCheckpointLogger))

  const dryRunLogger = logger.child('dryRun')
  const dryRun = dryRunWith({
    ...commonDeps(dryRunLogger),
    setTimeout: effects.setTimeout,
    clearTimeout: effects.clearTimeout,
    loadMessageMeta: effects.loadMessageMeta,
    /**
     * Dry-runs use a separate worker thread pool, so as to not block
     * primary evaluations
     */
    loadDryRunEvaluator: effects.loadDryRunEvaluator
  })

  /**
   * default readResult that works OOTB
   * - Uses PouchDB to cache evaluations and processes
   * - Uses ao Sequencer Unit
   * - Use arweave.net gateway
   */
  const readResultLogger = logger.child('readResult')
  const readResult = readResultWith({
    ...commonDeps(readResultLogger),
    loadMessageMeta: effects.loadMessageMeta
  })

  const readCronResultsLogger = logger.child('readCronResults')
  const readCronResults = readCronResultsWith({
    ...commonDeps(readCronResultsLogger),
    findEvaluations: effects.findEvaluations
  })

  const readResultsLogger = logger.child('readResults')
  const readResults = readResultsWith({
    ...commonDeps(readResultsLogger),
    findEvaluations: effects.findEvaluations
  })

  const healthcheck = healthcheckWith({ walletAddress: effects.address })

  const forceSnapshotLogger = logger.child('forceSnapshot')
  const forceSnapshot = forceSnapshotWith({
    writeFileCheckpointMemory: effects.writeFileCheckpointMemory,
    writeFileCheckpointRecord: effects.writeFileCheckpointRecord,
    cache: effects.wasmMemoryCache,
    logger: forceSnapshotLogger
  })

  /**
   * The CU domain -- the business logic of the unit
   */
  const domain = {
    ...domainConfig,
    logger,
    apis: {
      metrics,
      stats,
      pendingReadStates,
      readState,
      readStateFromCheckpoint,
      dryRun,
      readResult,
      readResults,
      readCronResults,
      healthcheck,
      forceSnapshot
    }
  }

  /**
   * Inject the business logic into the app effect,
   * which will expose an api for starting and stopping
   * the CU application, in whatever form it takes
   *
   * { start, stop }
   */
  const cu = applicationSchema.parse(await effects.app(domain))

  const memMonitor = setInterval(async () => {
    logger('Stats Usage: %j', await domain.apis.stats())
    logger('Currently Pending readState operations: %j', domain.apis.pendingReadStates())
  }, config.MEM_MONITOR_INTERVAL)
  memMonitor.unref()

  // DEPRECATED: Checkpointing is no longer done on an interval, as we are using the eager checkpointing feature
  // if (config.PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL) {
  //   logger('Setting up Interval to Checkpoint all Processes every %s', ms(domainConfig.PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL))
  //   const cacheCheckpointInterval = setInterval(async () => {
  //     logger('Checkpoint Interval Reached. Attempting to Checkpoint all Processes currently in WASM heap cache...')
  //     await domain.apis.checkpointProcesses().toPromise()
  //     logger('Interval Checkpoint Done. Done checkpointing all processes in WASM heap cache.')
  //   }, config.PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL)
  //   cacheCheckpointInterval.unref()
  // }

  // process.on('SIGUSR2', async () => {
  //   logger('Received SIGUSR2. Manually Attempting to Checkpoint all Processes currently in WASM heap cache...')
  //   await domain.apis.checkpointProcesses().toPromise()
  //   logger('SIGUSR2 Done. Done checkpointing all processes in WASM heap cache.')
  // })

  process.on('SIGTERM', async () => {
    logger('Received SIGTERM. Gracefully shutting down server...')
    // logger('Received SIGTERM. Attempting to Checkpoint all Processes currently in WASM heap cache...')

    await Promise.all([
      cu.stop()
      // domain.apis.checkpointWasmMemoryCache().toPromise()
    ])

    // logger('Done checkpointing all processes. Exiting...')
    process.exit()
  })

  return cu
}
