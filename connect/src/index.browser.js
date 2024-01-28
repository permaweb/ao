import { connect } from './index.common.js'

import { WalletClient } from './client/browser/index.js'

const GATEWAY_URL = globalThis.GATEWAY_URL || undefined
const MU_URL = globalThis.MU_URL || undefined
const CU_URL = globalThis.CU_URL || undefined

const { result, results, message, spawn, monitor } = connect({ GATEWAY_URL, MU_URL, CU_URL })

export { result, results, message, spawn, monitor }
export { connect }

/**
 * A function that builds a signer using the global arweaveWallet
 * commonly used in browser-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
