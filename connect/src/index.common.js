import { connect as schedulerUtilsConnect, locate } from '@permaweb/ao-scheduler-utils'

import * as MuClient from './client/ao-mu.js'
import * as CuClient from './client/ao-cu.js'
import * as GatewayClient from './client/gateway.js'
import * as HbClient from './client/hb.js'
import * as SuClient from './client/ao-su.js'

import { createLogger } from './logger.js'

import { messagesWith } from './lib/messages/index.js'
import { messageIdWith } from './lib/message-id/index.js'
import { processIdWith } from './lib/process-id/index.js'
import { requestWith } from './lib/request/index.js'
import { resultWith } from './lib/result/index.js'
import { messageWith, prepareWith, signedMessageWith } from './lib/message/index.js'
import { spawnWith } from './lib/spawn/index.js'
import { monitorWith } from './lib/monitor/index.js'
import { unmonitorWith } from './lib/unmonitor/index.js'
import { resultsWith } from './lib/results/index.js'
import { dryrunWith } from './lib/dryrun/index.js'
import { assignWith } from './lib/assign/index.js'
import { joinUrl } from './lib/utils.js'
import { getOperator, getNodeBalance } from './lib/payments/index.js'

// eslint-disable-next-line no-unused-vars
import { Types } from './dal.js'

const DEFAULT_GATEWAY_URL = 'https://arweave.net'
const DEFAULT_MU_URL = 'https://mu.ao-testnet.xyz'
const DEFAULT_CU_URL = 'https://cu.ao-testnet.xyz'
const DEFAULT_RELAY_URL = 'http://relay.ao-hb.xyz'
// eslint-disable-next-line no-unused-vars
const DEFAULT_AO_URL = 'http://m2.ao.computer'
const DEFAULT_RELAY_CU_URL = 'http://cu.s451-comm3-main.xyz'
const DEFAULT_RELAY_MU_URL = 'http://mu.s451-comm3-main.xyz'
const DEFAULT_DEVICE = 'relay@1.0'

const defaultFetch = fetch

export { serializeCron } from './lib/serializeCron/index.js'

/**
 * @param {{ createDataItemSigner: (wallet:any) => Types['signer'], createSigner: any }}
 */
export function connectWith({ createDataItemSigner, createSigner }) {
  const _logger = createLogger()

  /**
   * Run connect in HyperBEAM mode, relaying network calls through the configured
   * HyperBEAM node.
   *
   * @deprecated - relay mode will instead be triggered by a device passed to
   * mainnet mode. This should be removed at earliest convenience.
   *
   * @typedef HyperBeam
   * @property {any} wallet - the wallet to use to sign HyperBEAM HTTP messages
   * @property {string} [RELAY_URL] the HyperBEAM node
   *
   * @param {Services & HyperBeam} args
   * @returns {Omit<ReturnType<connect>, 'createDataItemSigner'> & { createDataItemSigner: () => Types['signer'] }}
   */
  // eslint-disable-next-line no-unused-vars
  function relayMode({
    MODE,
    signer,
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

    if (!signer) { throw new Error('relay mode requires providing a signer to connect()') }

    const relayDataItemSigner = signer ? () => signer : createDataItemSigner

    const relaySigner = signer ? () => signer : createSigner

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

    const requestLogger = logger.child('request')
    const request = requestWith({
      logger: requestLogger,
      request: HbClient.requestWith({
        fetch: defaultFetch,
        logger: requestLogger,
        HB_URL: RELAY_URL,
        signer
      })
    })

    const { validate } = schedulerUtilsConnect({
      cacheSize: 100,
      GRAPHQL_URL,
      GRAPHQL_MAX_RETRIES,
      GRAPHQL_RETRY_BACKOFF
    })

    const resultLogger = logger.child('result')
    const result = resultWith({
      signer,
      loadResult: CuClient.loadResultWith({
        fetch,
        CU_URL,
        logger: resultLogger
      }),
      logger: resultLogger
    })

    const messageLogger = logger.child('message')
    const message = messageWith({
      signer,
      deployMessage: MuClient.deployMessageWith({
        fetch,
        MU_URL,
        logger: messageLogger
      }),
      logger: messageLogger
    })

    const spawnLogger = logger.child('spawn')
    const spawn = spawnWith({
      signer,
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({
        fetch: originalFetch,
        GRAPHQL_URL,
        logger: spawnLogger
      }),
      validateScheduler: validate,
      deployProcess: MuClient.deployProcessWith({
        fetch,
        MU_URL,
        logger: spawnLogger
      }),
      logger: spawnLogger
    })

    const monitorLogger = logger.child('monitor')
    const monitor = monitorWith({
      signer,
      deployMonitor: MuClient.deployMonitorWith({
        fetch,
        MU_URL,
        logger: monitorLogger
      }),
      logger: monitorLogger
    })

    const unmonitorLogger = logger.child('unmonitor')
    const unmonitor = unmonitorWith({
      signer,
      deployUnmonitor: MuClient.deployUnmonitorWith({
        fetch,
        MU_URL,
        logger: unmonitorLogger
      }),
      logger: monitorLogger
    })

    const resultsLogger = logger.child('results')
    const results = resultsWith({
      signer,
      queryResults: CuClient.queryResultsWith({
        fetch,
        CU_URL,
        logger: resultsLogger
      }),
      logger: resultsLogger
    })

    const dryrunLogger = logger.child('dryrun')
    const dryrun = dryrunWith({
      signer,
      dryrunFetch: CuClient.dryrunFetchWith({
        fetch,
        CU_URL,
        logger: dryrunLogger
      }),
      logger: dryrunLogger
    })

    const assignLogger = logger.child('assign')
    const assign = assignWith({
      signer,
      deployAssign: MuClient.deployAssignWith({
        fetch,
        MU_URL,
        logger: assignLogger
      }),
      logger: messageLogger
    })

    return {
      MODE,
      request,
      result,
      results,
      message,
      spawn,
      monitor,
      unmonitor,
      dryrun,
      assign,
      ccreateDataItemSigner: relayDataItemSigner,
      createSigner: relaySigner
    }
  }

  function legacyMode({
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

    const { validate } = schedulerUtilsConnect({
      cacheSize: 100,
      GRAPHQL_URL,
      GRAPHQL_MAX_RETRIES,
      GRAPHQL_RETRY_BACKOFF
    })

    const resultLogger = logger.child('result')
    const result = resultWith({
      loadResult: CuClient.loadResultWith({
        fetch,
        CU_URL,
        logger: resultLogger
      }),
      logger: resultLogger
    })

    const messageLogger = logger.child('message')
    const message = messageWith({
      deployMessage: MuClient.deployMessageWith({
        fetch,
        MU_URL,
        logger: messageLogger
      }),
      logger: messageLogger
    })

    const signMessageLogger = logger.child('signMessage')
    const signMessage = prepareWith({
      signMessage: MuClient.signMessageWith({
        logger: signMessageLogger
      }),
      logger: signMessageLogger
    })

    const sendSignedMessageLogger = logger.child('sendSignedMessage')
    const sendSignedMessage = signedMessageWith({
      sendSignedMessage: MuClient.sendSignedMessageWith({
        fetch,
        MU_URL,
        logger: sendSignedMessageLogger
      }),
      logger: sendSignedMessageLogger
    })

    const spawnLogger = logger.child('spawn')
    const spawn = spawnWith({
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({
        fetch,
        GRAPHQL_URL,
        logger: spawnLogger
      }),
      validateScheduler: validate,
      deployProcess: MuClient.deployProcessWith({
        fetch,
        MU_URL,
        logger: spawnLogger
      }),
      logger: spawnLogger
    })

    const monitorLogger = logger.child('monitor')
    const monitor = monitorWith({
      deployMonitor: MuClient.deployMonitorWith({
        fetch,
        MU_URL,
        logger: monitorLogger
      }),
      logger: monitorLogger
    })

    const unmonitorLogger = logger.child('unmonitor')
    const unmonitor = unmonitorWith({
      deployUnmonitor: MuClient.deployUnmonitorWith({
        fetch,
        MU_URL,
        logger: unmonitorLogger
      }),
      logger: monitorLogger
    })

    const resultsLogger = logger.child('results')
    const results = resultsWith({
      queryResults: CuClient.queryResultsWith({
        fetch,
        CU_URL,
        logger: resultsLogger
      }),
      logger: resultsLogger
    })

    const dryrunLogger = logger.child('dryrun')
    const dryrun = dryrunWith({
      dryrunFetch: CuClient.dryrunFetchWith({
        fetch,
        CU_URL,
        logger: dryrunLogger
      }),
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

    const getMessageById = messageIdWith({
      getMessageId: SuClient.getMessageById({ fetch, locate })
    })

    const getMessages = messagesWith({
      messages: SuClient.getMessagesByRange({ fetch, locate })
    })

    const getLastSlot = processIdWith({
      processId: SuClient.getLastSlotWith({
        fetch,
        locate
      })
    })

    return {
      MODE,
      result,
      results,
      message,
      spawn,
      monitor,
      unmonitor,
      dryrun,
      assign,
      createDataItemSigner,
      signMessage,
      sendSignedMessage,
      getMessages,
      getLastSlot,
      getMessageById
    }
  }

  function mainnetMode({
    MODE,
    signer,
    GRAPHQL_URL,
    device = DEFAULT_DEVICE,
    URL = DEFAULT_RELAY_URL,
    MU_URL = DEFAULT_RELAY_MU_URL,
    CU_URL = DEFAULT_RELAY_CU_URL,
    fetch = defaultFetch
  }) {
    const isRelayMode = device === 'relay@1.0'
    const logger = isRelayMode
      ? _logger.child('mainnet-relay')
      : _logger.child('mainnet-process')
    logger('Mode Activated %s', isRelayMode ? '🔀' : '🐲')

    if (!signer) { throw new Error('mainnet mode requires providing a signer to connect()') }

    const mainnetDataItemSigner = signer ? () => signer : createDataItemSigner

    const mainnetSigner = signer ? () => signer : createSigner

    const relayFetch = HbClient.relayerWith({
      /**
       * Always wrap default fetch with relayer,
       * no embellishment beyond the relayer
       */
      fetch: defaultFetch,
      logger,
      HB_URL: URL,
      signer
    })

    /**
     * TODO: implement validating a scheduler
     */
    async function mockValidate(address) {
      logger('Mock validation for address "%s"', address)
      return true
    }

    const resultLogger = logger.child('result')
    const loadResult = isRelayMode
      ? CuClient.loadResultWith({
        fetch: relayFetch,
        logger: resultLogger,
        HB_URL: URL,
        CU_URL,
        signer
      })
      : HbClient.loadResultWith({
        fetch: defaultFetch,
        logger: resultLogger,
        HB_URL: URL,
        signer
      })
    const result = resultWith({
      signer,
      loadResult,
      logger: resultLogger
    })

    const messageLogger = logger.child('message')
    const deployMessage = isRelayMode
      ? MuClient.deployMessageWith({
        fetch: isRelayMode ? relayFetch : defaultFetch,
        logger: messageLogger,
        HB_URL: URL,
        MU_URL,
        CU_URL,
        signer
      })
      : HbClient.deployMessageWith({
        fetch: defaultFetch,
        logger: messageLogger,
        HB_URL: URL,
        signer
      })
    const message = messageWith({
      signer,
      deployMessage,
      logger: messageLogger
    })

    const resultsLogger = logger.child('results')
    const queryResults = isRelayMode
      ? CuClient.queryResultsWith({
        fetch: relayFetch,
        CU_URL,
        logger: resultsLogger
      })
      : HbClient.queryResultsWith({
        fetch: defaultFetch,
        HB_URL: URL,
        logger: resultsLogger,
        signer
      })

    const getMessageById = messageIdWith({
      getMessageId: SuClient.getMessageById({ fetch, locate })
    })

    const getMessages = messagesWith({
      messages: SuClient.getMessagesByRange({ fetch, locate })
    })

    const getLastSlot = processIdWith({
      processId: SuClient.getLastSlotWith({
        fetch,
        locate
      })
    })

    const results = resultsWith({
      signer,
      queryResults,
      logger: resultsLogger
    })

    const spawnLogger = logger.child('spawn')
    const deployProcess = isRelayMode
      ? MuClient.deployProcessWith({
        fetch: relayFetch,
        HB_URL: URL,
        MU_URL,
        logger: spawnLogger
      })
      : HbClient.deployProcessWith({
        fetch: defaultFetch,
        logger: spawnLogger,
        HB_URL: URL,
        signer
      })

    const spawn = spawnWith({
      signer,
      loadTransactionMeta: GatewayClient.loadTransactionMetaWith({
        fetch,
        GRAPHQL_URL,
        logger: spawnLogger
      }),
      validateScheduler: mockValidate,
      deployProcess,
      logger: spawnLogger
    })

    const dryrunLogger = logger.child('dryrun')
    const dryrun = dryrunWith({
      signer,
      dryrunFetch: CuClient.dryrunFetchWith({
        fetch: isRelayMode ? relayFetch : fetch,
        CU_URL,
        logger: dryrunLogger
      }),
      logger: dryrunLogger
    })

    const requestLogger = logger.child('request')

    const request = requestWith({
      signer,
      logger: requestLogger,
      MODE,
      method: 'GET',
      device,
      dryrun,
      message,
      result,
      spawn,
      request: HbClient.requestWith({
        fetch: defaultFetch,
        logger: requestLogger,
        HB_URL: URL,
        signer
      })
    })

    const getLogger = logger.child('get')
    const get = requestWith({
      logger: getLogger,
      MODE,
      method: 'GET',
      device,
      dryrun,
      message,
      result,
      spawn,
      signer,
      request: HbClient.requestWith({
        fetch: defaultFetch,
        method: 'GET',
        logger: getLogger,
        HB_URL: URL,
        signer
      })
    })

    const postLogger = logger.child('post')
    const post = requestWith({
      signer,
      logger: postLogger,
      MODE,
      method: 'POST',
      device,
      dryrun,
      message,
      result,
      spawn,
      request: HbClient.requestWith({
        fetch: defaultFetch,
        method: 'GET',
        logger: postLogger,
        HB_URL: URL,
        signer
      })
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

    return {
      MODE: isRelayMode ? 'relay' : 'mainnet',
      request,
      getMessages,
      getLastSlot,
      getMessageById,
      get,
      post,
      result,
      message,
      spawn,
      results,
      getOperator: getOperator({ fetch, URL }),
      getNodeBalance: getNodeBalance({
        request: HbClient.requestWith({
          fetch: defaultFetch,
          method: 'GET',
          logger: postLogger,
          HB_URL: URL,
          signer
        })
      }),
      createDataItemSigner: mainnetDataItemSigner,
      createSigner: mainnetSigner
    }
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
   * @typedef {'legacy' | 'mainnet'} ConnectMode
   *
   * @typedef ConnectArgsShared
   * @property {string} [GATEWAY_URL] - the url of the desried Gateway.
   * @property {string} [GRAPHQL_URL] - the url of the desired Arweave Gateway GraphQL Server
   * @property {number} [GRAPHQL_MAX_RETRIES] - the number of times to retry querying the gateway, utilizing an exponential backoff
   * @property {number} [GRAPHQL_RETRY_BACKOFF] - the initial backoff, in milliseconds (moot if GRAPHQL_MAX_RETRIES is set to 0)
   * @property {string} [MU_URL] - the url of the desried ao Messenger Unit. Also used as the relay MU in 'relay' mode
   * @property {string} [CU_URL] - the url of the desried ao Compute Unit. Also used as the relay CU in 'relay' mode
   *
   * @typedef ConnectArgsMainnet
   * @property {Types['signer']} [signer] - the signer used to sign Data items and HTTP messages.
   * @property {string} [URL] - the url of the desried ao Unit. Only applicable in 'mainnet' mode
   * @property {string} [device] - the default path either 'relay@1.0' or 'process@1.0'
   *
   * @typedef ConnectArgs
   * @property {ConnectMode} [MODE] - the mode that connect apis will be run in.
   *
   * @overload
   * @param {{ MODE: 'legacy'} & ConnectArgsShared } args
   * @returns {ReturnType<typeof legacyMode>}
   *
   * @overload
   * @param {{ MODE: 'mainnet'} & ConnectArgsShared & ConnectArgsMainnet } args
   * @returns {ReturnType<typeof mainnetMode>}
   *
   * @param {ConnectArgs} args
   * @returns {ReturnType<typeof legacyMode> | ReturnType<typeof mainnetMode>}
   */
  function connect(args = {}) {
    let { GRAPHQL_URL, GATEWAY_URL = DEFAULT_GATEWAY_URL, ...restArgs } = args

    if (!GRAPHQL_URL) { GRAPHQL_URL = joinUrl({ url: GATEWAY_URL, path: '/graphql' }) }

    const MODE = args.MODE || 'legacy'

    if (MODE === 'legacy') return legacyMode({ ...restArgs, GRAPHQL_URL })
    if (MODE === 'mainnet') return mainnetMode({ ...restArgs, GRAPHQL_URL })

    throw new Error(`Unrecognized MODE: ${MODE}`)
  }

  return connect
}
