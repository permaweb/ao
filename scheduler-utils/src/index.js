import { connect } from './index.common.js'

export * from './index.common.js'

const GRAPHQL_URL = process.env.GRAPHQL_URL || undefined
const CACHE_SIZE = process.env.SCHEDULER_UTILS_CACHE_SIZE || undefined
const FOLLOW_REDIRECTS = process.env.SCHEDULER_UTILS_FOLLOW_REDIRECTS === 'true' || undefined
const GRAPHQL_MAX_RETRIES = process.env.GRAPHQL_MAX_RETRIES || undefined
const GRAPHQL_RETRY_BACKOFF = process.env.GRAPHQL_RETRY_BACKOFF || undefined

const { locate, validate, raw } = connect({ GRAPHQL_URL, cacheSize: CACHE_SIZE, followRedirects: FOLLOW_REDIRECTS, GRAPHQL_MAX_RETRIES, GRAPHQL_RETRY_BACKOFF })

export { locate, validate, raw }
