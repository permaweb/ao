import { fromPromise } from 'hyper-async'

import {
  dbClientSchema,
  loadTransactionDataWith,
  loadTransactionMetaWith,
  sequencerClientSchema
} from './dal.js'
import { readStateWith } from './main.js'
import { createLogger } from './logger.js'

// Precanned clients to use for OOTB apis
import * as PouchDbClient from './client/pouchdb.js'
import * as WarpSequencerClient from './client/warp-sequencer.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const SEQUENCER_URL = globalThis.SEQUENCER_URL || 'https://gw.warp.cc'

const logger = createLogger('ao-middleware')

/**
 * default readState that works OOTB
 * - Uses PouchDB to cache interactions
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 */
const readStateLogger = logger.child('readState')
export const readState = readStateWith({
  loadTransactionMeta: loadTransactionMetaWith({ fetch, GATEWAY_URL }),
  loadTransactionData: loadTransactionDataWith({ fetch, GATEWAY_URL }),
  loadInteractions: fromPromise(
    sequencerClientSchema.shape.loadInteractions.implement(
      WarpSequencerClient.loadInteractionsWith({
        fetch,
        SEQUENCER_URL,
        pageSize: 2500,
        logger: readStateLogger.child('sequencer')
      })
    )
  ),
  db: {
    findLatestEvaluation: fromPromise(
      dbClientSchema.shape.findLatestEvaluation.implement(
        PouchDbClient.findLatestEvaluationWith({
          pouchDb: PouchDbClient.pouchDb,
          logger: readStateLogger.child('db')
        })
      )
    ),
    saveEvaluation: fromPromise(
      dbClientSchema.shape.saveEvaluation.implement(
        PouchDbClient.saveEvaluationWith({
          pouchDb: PouchDbClient.pouchDb,
          logger: readStateLogger.child('db')
        })
      )
    )
  },
  logger: readStateLogger
})
