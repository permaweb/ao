import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as SuClient from './client/ao-su.js'
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
const DEFAULT_HB_URL = 'http://localhost:8734'

const defaultFetch = fetch

export { serializeCron } from './lib/serializeCron/index.js'

/**
 * @param {{ createDataItemSigner: (wallet:any) => Types['signer'], createHbSigner: any }}
 */
export function connectWith ({ createDataItemSigner, createHbSigner }) {
  const logger = createLogger()

  /**
   * Build the sdk apis using the provided ao component urls. You can currently specify
   *
   * - a GATEWAY_URL
   * - a GRAPHQL_URL (defaults to GATEWAY_URL/graphql)
   * - a GRAPHQL_MAX_RETRIES. Defaults to 0
   * - a GRAPHQL_RETRY_BACKOFF. Defaults to 300 (moot if GRAPHQL_MAX_RETRIES is set to 0)
   * - a Messenger Unit URL
   * - a Compute Unit URL
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
   * @typedef Services
   * @property {string} [GATEWAY_URL] - the url of the desried Gateway.
   * @property {string} [GRAPHQL_URL] - the url of the desired Arweave Gateway GraphQL Server
   * @property {number} [GRAPHQL_MAX_RETRIES] - the number of times to retry querying the gateway, utilizing an exponential backoff
   * @property {number} [GRAPHQL_RETRY_BACKOFF] - the initial backoff, in milliseconds (moot if GRAPHQL_MAX_RETRIES is set to 0)
   * @property {string} [MU_URL] - the url of the desried ao Messenger Unit.
   * @property {string} [CU_URL] - the url of the desried ao Compute Unit.
   *
   * @param {Services} [services]
   */
  function connect ({
    GRAPHQL_URL,
    GRAPHQL_MAX_RETRIES,
    GRAPHQL_RETRY_BACKOFF,
    GATEWAY_URL = DEFAULT_GATEWAY_URL,
    MU_URL = DEFAULT_MU_URL,
    CU_URL = DEFAULT_CU_URL,
    fetch = defaultFetch
  } = {}) {
    if (!GRAPHQL_URL) GRAPHQL_URL = joinUrl({ url: GATEWAY_URL, path: '/graphql' })

    const { validate } = schedulerUtilsConnect({ cacheSize: 100, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

    const processMetaCache = SuClient.createProcessMetaCache({ MAX_SIZE: 25 })

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
      loadProcessMeta: SuClient.loadProcessMetaWith({
        fetch,
        cache: processMetaCache,
        logger: messageLogger
      }),
      // locateScheduler: locate,
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
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({ fetch, GRAPHQL_URL, logger: spawnLogger }),
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
      loadProcessMeta: SuClient.loadProcessMetaWith({
        fetch,
        cache: processMetaCache,
        logger: monitorLogger
      }),
      // locateScheduler: locate,
      deployMonitor: MuClient.deployMonitorWith({ fetch, MU_URL, logger: monitorLogger }),
      logger: monitorLogger
    })

    /**
     * default unmonitor that works OOTB
     * - Verifies the inputs
     * - post a signed message via the MU /monitor/:process endpoint
     */
    const unmonitorLogger = logger.child('unmonitor')
    const unmonitor = unmonitorWith({
      loadProcessMeta: SuClient.loadProcessMetaWith({
        fetch,
        cache: processMetaCache,
        logger: unmonitorLogger
      }),
      // locateScheduler: locate,
      deployUnmonitor: MuClient.deployUnmonitorWith({ fetch, MU_URL, logger: unmonitorLogger }),
      logger: monitorLogger
    })

    /**
     * results - returns batch of Process Results given a specified range
     */
    const resultsLogger = logger.child('results')
    const results = resultsWith({
      queryResults: CuClient.queryResultsWith({ fetch, CU_URL, logger: resultsLogger }),
      logger: resultsLogger
    })

    /**
     * dryrun - sends a message object to the cu and returns a result
     */
    const dryrunLogger = logger.child('dryrun')
    const dryrun = dryrunWith({
      dryrunFetch: CuClient.dryrunFetchWith({ fetch, CU_URL, logger: dryrunLogger }),
      logger: dryrunLogger
    })

    /**
     * POSTs an Assignment to the MU
     */
    const assignLogger = logger.child('assign')
    const assign = assignWith({
      deployAssign: MuClient.deployAssignWith({
        fetch,
        MU_URL,
        logger: assignLogger
      }),
      logger: messageLogger
    })

    return { result, results, message, spawn, monitor, unmonitor, dryrun, assign, createDataItemSigner }
  }

  /**
   * Run connect in HyperBEAM mode, relaying network calls through the configured
   * HyperBEAM node.
   *
   * @typedef HyperBeam
   * @property {any} wallet - the wallet to use to sign HyperBEAM HTTP messages
   * @property {string} [URL] the HyperBEAM node
   *
   * @param {Services & HyperBeam} args
   * @returns {Omit<ReturnType<connect>, 'createDataItemSigner'> & { createDataItemSigner: () => Types['signer'] }}
   */
  connect.hb = function ({
    wallet,
    URL = DEFAULT_HB_URL,
    ...rest
  }) {
    logger('HyperBEAM mode activated! ⚡️⭐️')

    const api = connect({
      ...rest,
      /**
       * TODO: do all fetch calls need to be relayed?
       * Could still use this downstream for 'non-relayed'
       * calls.
       *
       * For now, it isn't used at all downstream, in HyperBEAM
       * mode.
       */
      originalFetch: rest.fetch,
      /**
       * Use the HyperBEAM relay as fetch for all downstream
       * dependencies
       */
      fetch: HbClient.relayerWith({
        ...rest,
        fetch: defaultFetch,
        logger,
        HB_URL: URL,
        signer: createHbSigner(wallet)
      })
    })

    const createDataItemSigner = api.createDataItemSigner
    /**
     * createDataItemSigner is restricted to only
     * use the wallet configured with HyperBEAM
     */
    api.createDataItemSigner = () => createDataItemSigner(wallet)
    return api
  }

  return connect
}
