import { connect } from './index.common.js'

export * from './index.common.js'

const GRAPHQL_URL = globalThis.GRAPHQL_URL || undefined
const CACHE_SIZE = globalThis.SCHEDULER_UTILS_CACHE_SIZE || undefined
const FOLLOW_REDIRECTS = globalThis.SCHEDULER_UTILS_FOLLOW_REDIRECTS === 'true' || undefined
const GRAPHQL_MAX_RETRIES = globalThis.GRAPHQL_MAX_RETRIES || 0
const GRAPHQL_RETRY_BACKOFF = globalThis.GRAPHQL_RETRY_BACKOFF || 300

const { locate, validate, raw } = connect({ GRAPHQL_URL, cacheSize: CACHE_SIZE, followRedirects: FOLLOW_REDIRECTS, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

export { locate, validate, raw }
