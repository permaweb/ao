import { createLogger } from './logger.js'
import * as Constants from './constants.js'
import { buildSdk } from './index.common.js'

import * as IrysClient from './client/irys.js'
import { WalletClient } from './client/node/index.js'

const logger = createLogger('@permaweb/ao-sdk')

const { readState, writeInteraction, createContract } = buildSdk({
  ...Constants,
  logger,
  deployContractWithLogger: (logger) => IrysClient.deployContractWith({ IRYS_NODE: Constants.IRYS_NODE, logger })
})

export { readState, writeInteraction, createContract }

/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export const createDataItemSigner = WalletClient.createDataItemSigner
