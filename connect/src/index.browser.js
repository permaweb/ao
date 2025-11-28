import { connectWith, serializeCron } from './index.common.js'

import { createSigner as coreSigner } from '@permaweb/ao-core-libs/browser'

const GATEWAY_URL = globalThis.GATEWAY_URL || undefined
const MU_URL = globalThis.MU_URL || undefined
const CU_URL = globalThis.CU_URL || undefined
const GRAPHQL_URL = globalThis.GRAPHQL_URL || undefined
const GRAPHQL_MAX_RETRIES = globalThis.GRAPHQL_MAX_RETRIES || undefined
const GRAPHQL_RETRY_BACKOFF = globalThis.GRAPHQL_RETRY_BACKOFF || undefined

const RELAY_URL = globalThis.RELAY_URL || undefined
const AO_URL = globalThis.AO_URL = undefined

const connect = connectWith({
  createDataItemSigner: coreSigner,
  createSigner: coreSigner
})

const createDataItemSigner = coreSigner
const createSigner = coreSigner

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
