import { connect, serializeCron } from './index.common.js'

import { WalletClient } from './client/browser/index.js'

const GATEWAY_URL = globalThis.GATEWAY_URL || undefined
const MU_URL = globalThis.MU_URL || undefined
const CU_URL = globalThis.CU_URL || undefined
const GRAPHQL_URL = globalThis.GRAPHQL_URL || undefined
const GRAPHQL_MAX_RETRIES = globalThis.GRAPHQL_MAX_RETRIES || undefined
const GRAPHQL_RETRY_BACKOFF = globalThis.GRAPHQL_RETRY_BACKOFF || undefined

const { result, results, message, spawn, monitor, unmonitor, dryrun, assign } = connect({ GATEWAY_URL, MU_URL, CU_URL, GRAPHQL_URL, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

export { result, results, message, spawn, monitor, unmonitor, dryrun, assign }
export { connect }
export { serializeCron }
/**
 * A function that builds a signer using the global arweaveWallet
 * commonly used in browser-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
