// Precanned clients to use for OOTB apis
import * as GatewayClient from './client/gateway.js'
import * as PouchDbClient from './client/pouchdb.js'
import * as AoSuClient from './client/ao-su.js'

import { readResultWith } from './readResult.js'

import { readStateWith } from './readState.js'

export { createLogger } from './logger.js'

export const createApis = (ctx) => {
  const sharedDeps = (logger) => ({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL }),
    loadTransactionData: GatewayClient.loadTransactionDataWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL }),
    loadBlocksMeta: GatewayClient.loadBlocksMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL, pageSize: 90, logger: logger.child('gateway') }),
    findProcess: PouchDbClient.findProcessWith({ pouchDb: PouchDbClient.pouchDb }),
    saveProcess: PouchDbClient.saveProcessWith({ pouchDb: PouchDbClient.pouchDb }),
    findLatestEvaluation: PouchDbClient.findLatestEvaluationWith({ pouchDb: PouchDbClient.pouchDb }),
    saveEvaluation: PouchDbClient.saveEvaluationWith({ pouchDb: PouchDbClient.pouchDb }),
    loadTimestamp: AoSuClient.loadTimestampWith({ fetch: ctx.fetch, SU_URL: ctx.SEQUENCER_URL }),
    loadMessages: AoSuClient.loadMessagesWith({ fetch: ctx.fetch, SU_URL: ctx.SEQUENCER_URL, pageSize: 50 }),
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
    loadMessageMeta: AoSuClient.loadMessageMetaWith({ fetch: ctx.fetch, SU_URL: ctx.SEQUENCER_URL })
  })

  return { readState, readResult }
}
