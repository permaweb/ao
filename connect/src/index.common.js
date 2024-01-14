import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as SuClient from './client/ao-su.js'
import * as GatewayClient from './client/gateway.js'
import { createLogger } from './logger.js'

import { resultWith } from './lib/result/index.js'
import { messageWith } from './lib/message/index.js'
import { spawnWith } from './lib/spawn/index.js'
import { monitorWith } from './lib/monitor/index.js'

const DEFAULT_GATEWAY_URL = 'https://arweave.net'
const DEFAULT_MU_URL = 'https://ao-mu-1.onrender.com'
const DEFAULT_CU_URL = 'https://ao-cu-1.onrender.com'

/**
 * Build the sdk apis using the provided ao component urls. You can currently specify
 *
 * - a GATEWAY_URL
 * - a Messenger Unit URL
 * - a Compute Unit URL
 *
 * If any url is not provided, an SDK default will be used.
 * Invoking connect() with no parameters or an empty object is functionally equivalent
 * to using the top-lvl exports of the SDK ie.
 *
 * @example
 * import {
 *  spawn,
 *  message,
 *  result,
 *  monitor,
 *  connect
 * } from '@permaweb/ao-sdk';
 *
 * // These are functionally equivalent
 * connect() == { spawn, message, result, monitor }
 *
 * @typedef Services
 * @property {string} [GATEWAY_URL] - the url of the desried Gateway.
 * @property {string} [MU_URL] - the url of the desried ao Messenger Unit.
 * @property {string} [CU_URL] - the url of the desried ao Compute Unit.
 *
 * @param {Services} [services]
 */
export function connect ({
  GATEWAY_URL = DEFAULT_GATEWAY_URL,
  MU_URL = DEFAULT_MU_URL,
  CU_URL = DEFAULT_CU_URL
} = {}) {
  const logger = createLogger('@permaweb/ao-sdk')

  const { locate, validate } = schedulerUtilsConnect({ cacheSize: 100, GATEWAY_URL })

  const resultLogger = logger.child('result')
  const result = resultWith({
    loadResult: CuClient.loadResultWith({ fetch, CU_URL, logger: resultLogger }),
    logger: resultLogger
  })

  /**
   * default writeInteraction that works OOTB
   * - writes signed data item for message to the MU
   */
  const messageLogger = logger.child('message')
  const message = messageWith({
    loadProcessMeta: SuClient.loadProcessMetaWith({ fetch }),
    locateScheduler: locate,
    deployMessage: MuClient.deployMessageWith({ fetch, MU_URL, logger: messageLogger }),
    logger: messageLogger
  })

  /**
   * default spawn that works OOTB
   * - Verifies the inputs
   * - spawns the process via the MU
   */
  const spawnLogger = logger.child('spawn')
  const spawn = spawnWith({
    loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GATEWAY_URL }),
    validateScheduler: validate,
    deployProcess: MuClient.deployProcessWith({ fetch, MU_URL, logger: spawnLogger }),
    logger: spawnLogger
  })

  /**
   * default monitor that works OOTB
   * - Verifies the inputs
   * - post a signed message via the MU /monitor/:process endpoint
   */
  const monitorLogger = logger.child('monitor')
  const monitor = monitorWith({
    loadProcessMeta: SuClient.loadProcessMetaWith({ fetch }),
    locateScheduler: locate,
    deployMonitor: MuClient.deployMonitorWith({ fetch, MU_URL, logger: monitorLogger }),
    logger: monitorLogger
  })

  return { result, message, spawn, monitor }
}
