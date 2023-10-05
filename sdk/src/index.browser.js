import { createLogger } from './logger.js'
import * as Constants from './constants.js'
import { buildSdk } from './index.common.js'

import { WalletClient } from './client/browser/index.js'

const logger = createLogger('@permaweb/ao-sdk')

const { readState, writeInteraction, createContract } = buildSdk({
  ...Constants,
  logger,
  deployContractWithLogger: (logger) => WalletClient.deployContractWith({ logger })
})

export { readState, writeInteraction, createContract }
/**
 * A function that builds a signer using the global arweaveWallet
 * commonly used in browser-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
