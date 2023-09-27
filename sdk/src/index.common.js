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
import * as WarpGatewayClient from './client/warp-gateway.js'

import { readStateWith } from './lib/readState/index.js'
import { writeInteractionWith } from './lib/writeInteraction/index.js'
import { createContractWith } from './lib/createContract/index.js'

const WARP_GATEWAY_URL = globalThis.WARP_GATEWAY_URL || 'https://gw.warp.cc'
const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const MU_URL = globalThis.MU_URL || 'https://ao-mu-1.onrender.com'
const CU_URL = globalThis.CU_URL || 'https://ao-cu-1.onrender.com'

const logger = createLogger('@permaweb/ao-sdk')

const readStateLogger = logger.child('readState')

export function buildSdk ({ WalletClient }) {
  const readState = readStateWith({
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
  const writeInteraction = writeInteractionWith({
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

  const createContractLogger = logger.child('createContract')
  const createContract = createContractWith({
    loadTransactionMeta: fromPromise(
      loadTransactionMetaSchema.implement(
        GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL })
      )
    ),
    deployContract: fromPromise(
      WarpGatewayClient.deployContractWith({ fetch, WARP_GATEWAY_URL, logger: createContractLogger.child('warp-gateway') })
    ),
    createAndSignDataItem: fromPromise(WalletClient.createAndSignWith()),
    walletExists: fromPromise(WalletClient.walletExistsWith()),
    readWallet: fromPromise(WalletClient.readWalletWith()),
    logger: createContractLogger
  })

  return { readState, writeInteraction, createContract }
}
