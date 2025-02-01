import { connectWith, serializeCron } from './index.common.js'

import { WalletClient } from './client/node/index.js'
const GATEWAY_URL = process.env.GATEWAY_URL || undefined
const MU_URL = process.env.MU_URL || undefined
const CU_URL = process.env.CU_URL || undefined
const GRAPHQL_URL = process.env.GRAPHQL_URL || undefined
const GRAPHQL_MAX_RETRIES = process.env.GRAPHQL_MAX_RETRIES || undefined
const GRAPHQL_RETRY_BACKOFF = process.env.GRAPHQL_RETRY_BACKOFF || undefined

const HB_URL = process.env.HB_URL || undefined

const connect = connectWith({
  createDataItemSigner: WalletClient.createDataItemSigner,
  createHbSigner: WalletClient.createHbSigner
})

const { result, results, message, spawn, monitor, unmonitor, dryrun, assign, createDataItemSigner } = connect({
  GATEWAY_URL,
  MU_URL,
  CU_URL,
  GRAPHQL_URL,
  GRAPHQL_MAX_RETRIES,
  GRAPHQL_RETRY_BACKOFF
})

const originalHb = connect.hb
connect.hb = ({ URL = HB_URL, ...rest }) => originalHb({ URL, ...rest })

export { result, results, message, spawn, monitor, unmonitor, dryrun, assign }
export { connect }
export { serializeCron }
/**
 * A function that builds a signer using a wallet jwk interface
 * commonly used in node-based dApps
 *
 * This is provided as a convenience for consumers of the SDK
 * to use, but consumers can also implement their own signer
 */
export { createDataItemSigner }
