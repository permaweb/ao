import { connect } from './index.common.js'

import { WalletClient } from './client/node/index.js'

const GATEWAY_URL = process.env.GATEWAY_URL || undefined
const MU_URL = process.env.MU_URL || undefined
const CU_URL = process.env.CU_URL || undefined

const { result, message, spawn, monitor, unmonitor } = connect({ GATEWAY_URL, MU_URL, CU_URL })

export { result, message, spawn, monitor, unmonitor }
export { connect }

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
