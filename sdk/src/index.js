import { buildSdk } from './index.common.js'

import { WalletClient } from './client/node/index.js'

const { readState, writeInteraction, createProcess } = buildSdk()

export { readState, writeInteraction, createProcess }

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
