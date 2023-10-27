import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as SuClient from './client/ao-su.js'
import * as GatewayClient from './client/gateway.js'
import * as IrysClient from './client/irys.js'

import { createLogger } from './logger.js'

import { readStateWith } from './lib/readState/index.js'
import { writeMessageWith } from './lib/writeMessage/index.js'
import { createProcessWith } from './lib/createProcess/index.js'

const IRYS_NODE = globalThis.IRYS_NODE || globalThis.BUNDLR_NODE || 'node2'
const GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const MU_URL = globalThis.MU_URL || 'https://ao-mu-2.onrender.com'
const CU_URL = globalThis.CU_URL || 'https://ao-cu-2.onrender.com'
const SU_URL = globalThis.SU_URL || 'https://ao-su-1.onrender.com'

/**
 * Any environment specific build-time dependencies
 * can eventually be passed here (currently, there are none)
 *
 * Some dependencies, like the signer, are passed at runtime
 */
export function buildSdk () {
  const logger = createLogger('@permaweb/ao-sdk')

  const readStateLogger = logger.child('readState')
  const readState = readStateWith({
    loadState: CuClient.loadStateWith({ fetch, CU_URL, logger: readStateLogger }),
    logger: readStateLogger
  })

  /**
   * default writeInteraction that works OOTB
   * - writes signed data item for message to the MU
   */
  const writeMessageLogger = logger.child('writeMessage')
  const writeMessage = writeMessageWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
    deployMessage: MuClient.deployMessageWith({ fetch, MU_URL, logger: writeMessageLogger }),
    logger: writeMessageLogger
  })

  /**
   * default createContract that works OOTB
   * - Verifies the inputs
   * - Creates the process
   *   - In browser, uses Arweave Wallet to upload process to Irys (via dispatch)
   *   - On server, uses Irys Node to upload process to Irys
   * - Registers the Process with SU
   */
  const createProcessLogger = logger.child('createProcess')
  const createProcess = createProcessWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
    deployProcess: IrysClient.deployProcessWith({ fetch, IRYS_NODE, logger: createProcessLogger }),
    registerProcess: SuClient.registerProcessWith({ fetch, SU_URL, logger: createProcessLogger }),
    logger: createProcessLogger
  })

  return { readState, writeMessage, createProcess }
}
