// Precanned clients to use for OOTB apis
import * as GatewayClient from './client/gateway.js'
import * as PouchDbClient from './client/pouchdb.js'

import { readStateWith } from './readState.js'

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
    findProcess: PouchDbClient.findProcessWith({ pouchDb: PouchDbClient.pouchDb }),
    saveProcess: PouchDbClient.saveProcessWith({ pouchDb: PouchDbClient.pouchDb }),
    logger: readStateLogger
  })

  return { readState }
}
