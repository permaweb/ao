import Dataloader from 'dataloader'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

// Precanned clients to use for OOTB apis
import * as GatewayClient from './client/gateway.js'
import * as PouchDbClient from './client/pouchdb.js'
import * as AoSuClient from './client/ao-su.js'
import * as WalletClient from './client/wallet.js'

import { readResultWith } from './readResult.js'
import { readStateWith } from './readState.js'
import { readCronOutboxesWith } from './readCronOutboxes.js'
import { healthcheckWith } from './healthcheck.js'

export { createLogger } from './logger.js'
export { domainConfigSchema } from './model.js'
export { errFrom } from './utils.js'

export const createApis = (ctx) => {
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
  const pouchDb = PouchDbClient.createPouchDbClient({ maxListeners: ctx.DB_MAX_LISTENERS, path: ctx.DB_PATH })

  const sharedDeps = (logger) => ({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
    loadTransactionData: GatewayClient.loadTransactionDataWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, logger }),
    loadBlocksMeta: GatewayClient.loadBlocksMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, pageSize: 90, logger: logger.child('gateway') }),
    findProcess: PouchDbClient.findProcessWith({ pouchDb, logger }),
    saveProcess: PouchDbClient.saveProcessWith({ pouchDb, logger }),
    findLatestEvaluation: PouchDbClient.findLatestEvaluationWith({ pouchDb, logger }),
    saveEvaluation: PouchDbClient.saveEvaluationWith({ pouchDb, logger }),
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

  const readCronMessagesLogger = ctx.logger.child('readCronMessages')
  const readCronMessages = readCronOutboxesWith({
    ...sharedDeps(readCronMessagesLogger),
    findEvaluations: PouchDbClient.findEvaluationsWith({ pouchDb, logger: readCronMessagesLogger })
  })

  const arweave = WalletClient.createWalletClient()
  const healthcheck = healthcheckWith({
    walletAddress: WalletClient.addressWith({ WALLET: ctx.WALLET, arweave })
  })

  return { readState, readResult, readCronMessages, healthcheck }
}
