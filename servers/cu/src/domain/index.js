import Dataloader from 'dataloader'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

// Precanned clients to use for OOTB apis
import * as GatewayClient from './client/gateway.js'
import * as PouchDbClient from './client/pouchdb.js'
import * as AoSuClient from './client/ao-su.js'
import * as WalletClient from './client/wallet.js'

import { readResultWith } from './readResult.js'
import { readStateWith } from './readState.js'
import { readCronResultsWith } from './readCronResults.js'
import { healthcheckWith } from './healthcheck.js'
import { readResultsWith } from './readResults.js'
import { dryRunWith } from './dryRun.js'

export { createLogger } from './logger.js'
export { domainConfigSchema } from './model.js'
export { errFrom } from './utils.js'

export const createApis = async (ctx) => {
  ctx.logger('Creating business logic apis')

  const { locate } = schedulerUtilsConnect({ cacheSize: 100, GATEWAY_URL: ctx.GATEWAY_URL })
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

  const sharedDeps = (logger) => ({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
    loadTransactionData: GatewayClient.loadTransactionDataWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
    loadBlocksMeta: GatewayClient.loadBlocksMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, pageSize: 90, logger }),
    findProcess: PouchDbClient.findProcessWith({ pouchDb, logger }),
    saveProcess: PouchDbClient.saveProcessWith({ pouchDb, logger }),
    findEvaluation: PouchDbClient.findEvaluationWith({ pouchDb, logger }),
    findLatestEvaluation: PouchDbClient.findLatestEvaluationWith({ pouchDb, logger }),
    saveEvaluation: PouchDbClient.saveEvaluationWith({ pouchDb, logger }),
    findBlocks: PouchDbClient.findBlocksWith({ pouchDb, logger }),
    saveBlocks: PouchDbClient.saveBlocksWith({ pouchDb, logger }),
    findMessageHash: PouchDbClient.findMessageHashWith({ pouchDb, logger }),
    loadTimestamp: AoSuClient.loadTimestampWith({ fetch: ctx.fetch, logger }),
    loadProcess: AoSuClient.loadProcessWith({ fetch: ctx.fetch, logger }),
    loadMessages: AoSuClient.loadMessagesWith({ fetch: ctx.fetch, pageSize: 50, logger }),
    locateScheduler: locateDataloader.load.bind(locateDataloader),
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
    findEvaluations: PouchDbClient.findEvaluationsWith({ pouchDb, logger: readCronResultsLogger })
  })

  const readResultsLogger = ctx.logger.child('readResults')
  const readResults = readResultsWith({
    ...sharedDeps(readCronResultsLogger),
    findEvaluations: PouchDbClient.findEvaluationsWith({ pouchDb, logger: readResultsLogger })
  })

  const arweave = WalletClient.createWalletClient()
  const healthcheck = healthcheckWith({
    walletAddress: WalletClient.addressWith({ WALLET: ctx.WALLET, arweave })
  })

  return { readState, dryRun, readResult, readResults, readCronResults, healthcheck }
}
