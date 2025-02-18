import { connectWith, serializeCron } from './index.common.js'

import { WalletClient } from './client/node/index.js'

const GATEWAY_URL = process.env.GATEWAY_URL || undefined
const MU_URL = process.env.MU_URL || undefined
const CU_URL = process.env.CU_URL || undefined
const GRAPHQL_URL = process.env.GRAPHQL_URL || undefined
const GRAPHQL_MAX_RETRIES = process.env.GRAPHQL_MAX_RETRIES || undefined
const GRAPHQL_RETRY_BACKOFF = process.env.GRAPHQL_RETRY_BACKOFF || undefined

const RELAY_URL = process.env.RELAY_URL || undefined
const AO_URL = process.env.AO_URL = undefined

const connect = connectWith({
  createDataItemSigner: WalletClient.createDataItemSigner,
  createSigner: WalletClient.createSigner
})

const createDataItemSigner = WalletClient.createDataItemSigner
const createSigner = WalletClient.createSigner

export { createDataItemSigner, createSigner }
export { connect }
export { serializeCron }

/**
 * @deprecated top level exports will soon be removed. Use connect()
 * instead.
 *
 * These will only operate in legacy mode
 */
const { result, results, message, spawn, monitor, unmonitor, dryrun, assign } = connect({
  MODE: 'legacy',
  GATEWAY_URL,
  MU_URL,
  CU_URL,
  RELAY_URL,
  AO_URL,
  GRAPHQL_URL,
  GRAPHQL_MAX_RETRIES,
  GRAPHQL_RETRY_BACKOFF,
  noLog: true
})
export { result, results, message, spawn, monitor, unmonitor, dryrun, assign }
