import { fromPromise } from 'hyper-async'

import {
  loadStateSchema,
  writeInteractionSchema,
  signInteractionSchema,
  loadTransactionMetaSchema
} from './dal.js'
import { createLogger } from './logger.js'

import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as GatewayClient from './client/gateway.js'

import { readStateWith } from './lib/readState/index.js'
import { writeInteractionWith } from './lib/writeInteraction/index.js'

const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const MU_URL = globalThis.MU_URL || 'https://ao-mu-1.onrender.com'
const CU_URL = globalThis.CU_URL || 'https://ao-cu-1.onrender.com'

const logger = createLogger('@permaweb/ao-sdk')

const readStateLogger = logger.child('readState')
export const readState = readStateWith({
  loadState: fromPromise(
    loadStateSchema.implement(CuClient.loadStateWith({ fetch, CU_URL, logger: readStateLogger }))
  ),
  logger: readStateLogger
})

/**
 * default writeInteraction that works OOTB
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 * - use arbundles createData for signing
 */
export const writeInteraction = writeInteractionWith({
  loadTransactionMeta: fromPromise(
    loadTransactionMetaSchema.implement(
      GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL })
    )
  ),
  writeInteraction: fromPromise(
    writeInteractionSchema.implement(
      MuClient.writeInteractionWith({
        fetch,
        MU_URL
      })
    )
  ),
  signInteraction: fromPromise(
    signInteractionSchema.implement(
      MuClient.signInteractionWith({
        createDataItem: MuClient.createData
      })
    )
  ),
  logger: logger.child('writeInteraction')
})
