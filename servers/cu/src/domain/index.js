import { createLogger } from './logger.js'

// Precanned clients to use for OOTB apis
import * as PouchDbClient from './client/pouchdb.js'
import * as WarpSequencerClient from './client/warp-sequencer.js'
import * as GatewayClient from './client/gateway.js'

import { readStateWith } from './lib/readState/index.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const SEQUENCER_URL = globalThis.SEQUENCER_URL || 'https://gw.warp.cc'

const logger = createLogger('ao-cu')

/**
 * default readState that works OOTB
 * - Uses PouchDB to cache interactions
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 */
const readStateLogger = logger.child('readState')
export const readState = readStateWith({
  loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
  loadTransactionData: GatewayClient.loadTransactionDataWith({ fetch, GATEWAY_URL }),
  loadInteractions: WarpSequencerClient.loadInteractionsWith({
    fetch,
    SEQUENCER_URL,
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
