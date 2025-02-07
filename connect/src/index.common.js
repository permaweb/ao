import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as GatewayClient from './client/gateway.js'
import * as HbClient from './client/hb.js'
import { createLogger } from './logger.js'

import { resultWith } from './lib/result/index.js'
import { messageWith } from './lib/message/index.js'
import { spawnWith } from './lib/spawn/index.js'
import { monitorWith } from './lib/monitor/index.js'
import { unmonitorWith } from './lib/unmonitor/index.js'
import { resultsWith } from './lib/results/index.js'
import { dryrunWith } from './lib/dryrun/index.js'
import { assignWith } from './lib/assign/index.js'
import { joinUrl } from './lib/utils.js'
// eslint-disable-next-line no-unused-vars
import { Types } from './dal.js'

const DEFAULT_GATEWAY_URL = 'https://arweave.net'
const DEFAULT_MU_URL = 'https://mu.ao-testnet.xyz'
const DEFAULT_CU_URL = 'https://cu.ao-testnet.xyz'
/**
 * TODO: set this when we know it
 */
const DEFAULT_RELAY_URL = 'http://localhost:8734'
const DEFAULT_AO_URL = 'http://localhost:8734'
const DEFAULT_RELAY_CU_URL = 'http://cu.s451-comm3-main.xyz'
const DEFAULT_RELAY_MU_URL = 'http://mu.s451-comm3-main.xyz'

const defaultFetch = fetch

export { serializeCron } from './lib/serializeCron/index.js'

/**
 * @param {{ createDataItemSigner: (wallet:any) => Types['signer'], createHbSigner: any }}
 */
export function connectWith ({ createDataItemSigner, createHbSigner }) {
  const _logger = createLogger()

  /**
   * Run connect in HyperBEAM mode, relaying network calls through the configured
   * HyperBEAM node.
   *
   * @typedef HyperBeam
   * @property {any} wallet - the wallet to use to sign HyperBEAM HTTP messages
   * @property {string} [RELAY_URL] the HyperBEAM node
   *
   * @param {Services & HyperBeam} args
   * @returns {Omit<ReturnType<connect>, 'createDataItemSigner'> & { createDataItemSigner: () => Types['signer'] }}
   */
  function relayMode ({
    MODE,
    wallet,
    GRAPHQL_URL,
    GRAPHQL_MAX_RETRIES,
    GRAPHQL_RETRY_BACKOFF,
    MU_URL = DEFAULT_RELAY_MU_URL,
    CU_URL = DEFAULT_RELAY_CU_URL,
    RELAY_URL = DEFAULT_RELAY_URL,
    fetch: originalFetch = defaultFetch
  }) {
    const logger = _logger.child('relay')
    logger('Mode Activated 🔀')

    const signer = createHbSigner(wallet)
    const fetch = HbClient.relayerWith({
      /**
       * Always wrap default fetch with relayer,
       * no embellishment beyond the relayer
       */
      fetch: defaultFetch,
      logger,
      HB_URL: RELAY_URL,
      signer
    })

    const { validate } = schedulerUtilsConnect({ cacheSize: 100, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

    const resultLogger = logger.child('result')
    const result = resultWith({
      loadResult: CuClient.loadResultWith({ fetch, CU_URL, logger: resultLogger }),
      logger: resultLogger
    })

    const messageLogger = logger.child('message')
    const message = messageWith({
      deployMessage: MuClient.deployMessageWith({ fetch, MU_URL, logger: messageLogger }),
      logger: messageLogger
    })

    const spawnLogger = logger.child('spawn')
    const spawn = spawnWith({
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch: originalFetch, GRAPHQL_URL, logger: spawnLogger }),
      validateScheduler: validate,
      deployProcess: MuClient.deployProcessWith({ fetch, MU_URL, logger: spawnLogger }),
      logger: spawnLogger
    })

    const monitorLogger = logger.child('monitor')
    const monitor = monitorWith({
      deployMonitor: MuClient.deployMonitorWith({ fetch, MU_URL, logger: monitorLogger }),
      logger: monitorLogger
    })

    const unmonitorLogger = logger.child('unmonitor')
    const unmonitor = unmonitorWith({
      deployUnmonitor: MuClient.deployUnmonitorWith({ fetch, MU_URL, logger: unmonitorLogger }),
      logger: monitorLogger
    })

    const resultsLogger = logger.child('results')
    const results = resultsWith({
      queryResults: CuClient.queryResultsWith({ fetch, CU_URL, logger: resultsLogger }),
      logger: resultsLogger
    })

    const dryrunLogger = logger.child('dryrun')
    const dryrun = dryrunWith({
      dryrunFetch: CuClient.dryrunFetchWith({ fetch, CU_URL, logger: dryrunLogger }),
      logger: dryrunLogger
    })

    const assignLogger = logger.child('assign')
    const assign = assignWith({
      deployAssign: MuClient.deployAssignWith({
        fetch,
        MU_URL,
        logger: assignLogger
      }),
      logger: messageLogger
    })

    return { MODE, result, results, message, spawn, monitor, unmonitor, dryrun, assign, createDataItemSigner }
  }

  function legacyMode ({
    MODE,
    GRAPHQL_URL,
    GRAPHQL_MAX_RETRIES,
    GRAPHQL_RETRY_BACKOFF,
    MU_URL = DEFAULT_MU_URL,
    CU_URL = DEFAULT_CU_URL,
    fetch = defaultFetch,
    noLog
  }) {
    const logger = _logger.child('legacy')
    if (!noLog) logger('Mode Activated ℹ️')

    const { validate } = schedulerUtilsConnect({ cacheSize: 100, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

    const resultLogger = logger.child('result')
    const result = resultWith({
      loadResult: CuClient.loadResultWith({ fetch, CU_URL, logger: resultLogger }),
      logger: resultLogger
    })

    const messageLogger = logger.child('message')
    const message = messageWith({
      deployMessage: MuClient.deployMessageWith({ fetch, MU_URL, logger: messageLogger }),
      logger: messageLogger
    })

    const spawnLogger = logger.child('spawn')
    const spawn = spawnWith({
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GRAPHQL_URL, logger: spawnLogger }),
      validateScheduler: validate,
      deployProcess: MuClient.deployProcessWith({ fetch, MU_URL, logger: spawnLogger }),
      logger: spawnLogger
    })

    const monitorLogger = logger.child('monitor')
    const monitor = monitorWith({
      deployMonitor: MuClient.deployMonitorWith({ fetch, MU_URL, logger: monitorLogger }),
      logger: monitorLogger
    })

    const unmonitorLogger = logger.child('unmonitor')
    const unmonitor = unmonitorWith({
      deployUnmonitor: MuClient.deployUnmonitorWith({ fetch, MU_URL, logger: unmonitorLogger }),
      logger: monitorLogger
    })

    const resultsLogger = logger.child('results')
    const results = resultsWith({
      queryResults: CuClient.queryResultsWith({ fetch, CU_URL, logger: resultsLogger }),
      logger: resultsLogger
    })

    const dryrunLogger = logger.child('dryrun')
    const dryrun = dryrunWith({
      dryrunFetch: CuClient.dryrunFetchWith({ fetch, CU_URL, logger: dryrunLogger }),
      logger: dryrunLogger
    })

    const assignLogger = logger.child('assign')
    const assign = assignWith({
      deployAssign: MuClient.deployAssignWith({
        fetch,
        MU_URL,
        logger: assignLogger
      }),
      logger: messageLogger
    })

    return { MODE, result, results, message, spawn, monitor, unmonitor, dryrun, assign, createDataItemSigner }
  }

  function mainnetMode ({
    MODE,
    wallet,
    GRAPHQL_URL,
    AO_URL = DEFAULT_AO_URL,
    fetch = defaultFetch
  }) {
    const logger = _logger.child('mainnet')
    logger('Mode Activated 🐲')

    if (!wallet) throw new Error('mainnet mode requires providing a wallet to connect()')

    const signer = createHbSigner(wallet)
    const staticWalletDataItemSigner = () => createDataItemSigner(wallet)
    /**
     * TODO: implement validating a scheduler
     */
    async function mockValidate (address) {
      logger('Mock validation for address "%s"', address)
      return true
    }

    const resultLogger = logger.child('result')
    const result = resultWith({
      loadResult: HbClient.loadResultWith({
        fetch: defaultFetch,
        logger: resultLogger,
        HB_URL: AO_URL,
        signer
      }),
      logger: resultLogger
    })

    const messageLogger = logger.child('message')
    const message = messageWith({
      deployMessage: HbClient.deployMessageWith({
        fetch: defaultFetch,
        logger: messageLogger,
        HB_URL: AO_URL,
        signer
      }),
      logger: messageLogger
    })

    const spawnLogger = logger.child('spawn')
    const spawn = spawnWith({
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({
        fetch,
        GRAPHQL_URL,
        logger: spawnLogger
      }),
      validateScheduler: mockValidate,
      deployProcess: HbClient.deployProcessWith({
        fetch: defaultFetch,
        logger: spawnLogger,
        HB_URL: AO_URL,
        signer
      }),
      logger: spawnLogger
    })

    // const monitorLogger = logger.child('monitor')
    // const monitor = monitorWith({
    //   deployMonitor: MuClient.deployMonitorWith({ fetch, MU_URL, logger: monitorLogger }),
    //   logger: monitorLogger
    // })

    // const unmonitorLogger = logger.child('unmonitor')
    // const unmonitor = unmonitorWith({
    //   deployUnmonitor: MuClient.deployUnmonitorWith({ fetch, MU_URL, logger: unmonitorLogger }),
    //   logger: monitorLogger
    // })

    // const resultsLogger = logger.child('results')
    // const results = resultsWith({
    //   queryResults: CuClient.queryResultsWith({ fetch, CU_URL, logger: resultsLogger }),
    //   logger: resultsLogger
    // })

    // const dryrunLogger = logger.child('dryrun')
    // const dryrun = dryrunWith({
    //   dryrunFetch: CuClient.dryrunFetchWith({ fetch, CU_URL, logger: dryrunLogger }),
    //   logger: dryrunLogger
    // })

    // const assignLogger = logger.child('assign')
    // const assign = assignWith({
    //   deployAssign: MuClient.deployAssignWith({
    //     fetch,
    //     MU_URL,
    //     logger: assignLogger
    //   }),
    //   logger: messageLogger
    // })

    return { MODE, result, message, spawn, createDataItemSigner: staticWalletDataItemSigner }
  }

  /**
   * Build the sdk apis using the provided configuration. You can currently specify
   *
   * - a GATEWAY_URL
   * - a GRAPHQL_URL (defaults to GATEWAY_URL/graphql)
   * - a GRAPHQL_MAX_RETRIES. Defaults to 0
   * - a GRAPHQL_RETRY_BACKOFF. Defaults to 300 (moot if GRAPHQL_MAX_RETRIES is set to 0)
   * - a Messenger Unit URL
   * - a Compute Unit URL
   * - a AO Unit URL (in mainnet mode)
   * - a Relay Unit URL (in relay mode)
   * - a wallet to use for signing HTTP messages (in mainnet or relay mode)
   *
   * If any value is not provided, an SDK default will be used.
   * Invoking connect() with no parameters or an empty object is functionally equivalent
   * to using the top-lvl exports of the SDK ie.
   *
   * @example
   * import {
   *  spawn,
   *  message,
   *  result,
   *  results,
   *  monitor,
   *  connect
   * } from '@permaweb/ao-sdk';
   *
   * // These are functionally equivalent
   * connect() == { spawn, message, result, results, monitor }
   *
   * @typedef ConnectArgs
   * @property {'legacy' | 'relay' | 'mainnet'} [MODE] - the mode that connect apis will be run in.
   * @property {string} [GATEWAY_URL] - the url of the desried Gateway.
   * @property {string} [GRAPHQL_URL] - the url of the desired Arweave Gateway GraphQL Server
   * @property {number} [GRAPHQL_MAX_RETRIES] - the number of times to retry querying the gateway, utilizing an exponential backoff
   * @property {number} [GRAPHQL_RETRY_BACKOFF] - the initial backoff, in milliseconds (moot if GRAPHQL_MAX_RETRIES is set to 0)
   * @property {string} [MU_URL] - the url of the desried ao Messenger Unit. Also used as the relay MU in 'relay' mode
   * @property {string} [CU_URL] - the url of the desried ao Compute Unit. Also used as the relay CU in 'relay' mode
   * @property {string} [AO_URL] - the url of the desried ao Unit. Only applicable in 'mainnet' mode
   * @property {string} [RELAY_URL] - the url of the desried relay Unit. Only applicable in 'relay' mode
   * @property {any} [wallet] - the wallet used to sign HTTP Messages. Only applicable in 'relay' or 'mainnet' mode
   *
   * @param {ConnectArgs} [args]
   */
  function connect (args = {}) {
    let { GRAPHQL_URL, GATEWAY_URL = DEFAULT_GATEWAY_URL, ...restArgs } = args

    if (!GRAPHQL_URL) GRAPHQL_URL = joinUrl({ url: GATEWAY_URL, path: '/graphql' })

    const MODE = args.MODE || 'legacy'

    if (MODE === 'legacy') return legacyMode({ ...restArgs, GRAPHQL_URL })
    if (MODE === 'relay') return relayMode({ ...restArgs, GRAPHQL_URL })
    if (MODE === 'mainnet') return mainnetMode({ ...restArgs, GRAPHQL_URL })

    throw new Error(`Unrecognized MODE: ${MODE}`)
  }

  return connect
}
