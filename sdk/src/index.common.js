import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as SuClient from './client/ao-su.js'
import * as GatewayClient from './client/gateway.js'
import { createLogger } from './logger.js'

import { readResultWith } from './lib/readResult/index.js'
import { sendMessageWith } from './lib/sendMessage/index.js'
import { spawnProcessWith } from './lib/spawnProcess/index.js'

const DEFAULT_GATEWAY_URL = globalThis.GATEWAY || 'https://arweave.net'
const DEFAULT_MU_URL = globalThis.MU_URL || 'https://ao-mu-1.onrender.com'
const DEFAULT_CU_URL = globalThis.CU_URL || 'https://ao-cu-1.onrender.com'
const DEFAULT_SU_URL = globalThis.SU_URL || 'https://ao-su-1.onrender.com'

/**
 * Build the sdk apis using the provided ao component urls. You can currently specify
 *
 * - a GATEWAY_URL
 * - a Messenger Unit URL
 * - a Compute Unit URL
 * - a Sequencer Unit URL
 *
 * If any url is not provided, an SDK default will be used.
 * Invoking connect() with no parameters or an empty object is functionally equivalent
 * to using the top-lvl exports of the SDK ie.
 *
 * @example
 * import {
 *  spawnProcess,
 *  sendMessage,
 *  readResult
 *  connect
 * } from '@permaweb/ao-sdk';
 *
 * // These are functionally equivalent
 * connect() == { spawnProcess, sendMessage, readResult }
 *
 * @typedef Services
 * @property {string} [GATEWAY_URL] - the url of the desried Gateway.
 * @property {string} [MU_URL] - the url of the desried ao Messenger Unit.
 * @property {string} [CU_URL] - the url of the desried ao Compute Unit.
 * @property {string} [SU_URL] - the url of the desried ao Sequencer Unit.
 *
 * @param {Services} [services]
 */
export function connect ({
  GATEWAY_URL = DEFAULT_GATEWAY_URL,
  MU_URL = DEFAULT_MU_URL,
  CU_URL = DEFAULT_CU_URL,
  SU_URL = DEFAULT_SU_URL
} = {}) {
  const logger = createLogger('@permaweb/ao-sdk')

  const readResultLogger = logger.child('readResult')
  const readResult = readResultWith({
    loadResult: CuClient.loadResultWith({ fetch, CU_URL, logger: readResultLogger }),
    logger: readResultLogger
  })

  /**
   * default writeInteraction that works OOTB
   * - writes signed data item for message to the MU
   */
  const sendMessageLogger = logger.child('sendMessage')
  const sendMessage = sendMessageWith({
    loadProcessMeta: SuClient.loadProcessMetaWith({ fetch, SU_URL }),
    deployMessage: MuClient.deployMessageWith({ fetch, MU_URL, logger: sendMessageLogger }),
    logger: sendMessageLogger
  })

  /**
   * default createContract that works OOTB
   * - Verifies the inputs
   * - Creates the process
   *   - In browser, uses Arweave Wallet to upload process to Irys (via dispatch)
   *   - On server, uses Irys Node to upload process to Irys
   * - Registers the Process with SU
   */
  const spawnProcessLogger = logger.child('spawnProcess')
  const spawnProcess = spawnProcessWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
    deployProcess: SuClient.deployProcessWith({ fetch, SU_URL, logger: spawnProcessLogger }),
    logger: spawnProcessLogger
  })

  return { readResult, sendMessage, spawnProcess }
}
