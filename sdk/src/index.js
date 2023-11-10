import { connect } from './index.common.js'

import { WalletClient } from './client/node/index.js'

const { readState, sendMessage, spawnProcess } = connect()

export { readState, sendMessage, spawnProcess }
export { connect }

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
