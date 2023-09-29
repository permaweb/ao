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

/**
 * Any environment specific build-time dependencies
 * can be passed in here
 *
 * Right now, no environment specific build-time dependencies are needed
 * and instead are provided at runtime by the consumer
 */
export function buildSdk () {
  const readState = readStateWith({
    loadState: CuClient.loadStateWith({ fetch, CU_URL, logger: readStateLogger }),
    logger: readStateLogger
  })

  /**
   * default writeInteraction that works OOTB
   * - Uses Warp Sequencer
   * - Use arweave.net gateway
   */
  const writeInteractionLogger = logger.child('writeInteraction')
  const writeInteraction = writeInteractionWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
    deployInteraction: MuClient.deployInteractionWith({ fetch, MU_URL, logger: writeInteractionLogger }),
    logger: writeInteractionLogger
  })

  /**
   * default createContract that works OOTB
   * - Uses Warp Gateway to upload contracts
   * - Use arweave.net gateway
   */
  const createContractLogger = logger.child('createContract')
  const createContract = createContractWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
    deployContract: WarpGatewayClient.deployContractWith({ fetch, WARP_GATEWAY_URL, logger: createContractLogger }),
    logger: createContractLogger
  })

  return { readState, writeInteraction, createContract }
}
