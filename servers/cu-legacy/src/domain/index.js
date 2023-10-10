// Precanned clients to use for OOTB apis
import * as PouchDbClient from './client/pouchdb.js'
import * as WarpSequencerClient from './client/warp-sequencer.js'
import * as GatewayClient from './client/gateway.js'

import { readStateWith } from './lib/readState/index.js'

export { createLogger } from './logger.js'

export const createApis = (ctx) => {
  /**
   * default readState that works OOTB
   * - Uses PouchDB to cache interactions
   * - Uses Warp Sequencer
   * - Use arweave.net gateway
   */
  const readStateLogger = ctx.logger.child('readState')

  const readState = readStateWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL }),
    loadTransactionData: GatewayClient.loadTransactionDataWith({ fetch: ctx.fetch, GATEWAY_URL: ctx.GATEWAY_URL }),
    loadInteractions: WarpSequencerClient.loadInteractionsWith({
      SEQUENCER_URL: ctx.SEQUENCER_URL,
      fetch: ctx.fetch,
      pageSize: 2500,
      logger: readStateLogger.child('sequencer')
    }),
    findLatestEvaluation: PouchDbClient.findLatestEvaluationWith({
      pouchDb: PouchDbClient.pouchDb,
      logger: readStateLogger.child('db')
    }),
    saveEvaluation: PouchDbClient.saveEvaluationWith({
      pouchDb: PouchDbClient.pouchDb,
      logger: readStateLogger.child('db')
    }),
    logger: readStateLogger
  })

  return { readState }
}
