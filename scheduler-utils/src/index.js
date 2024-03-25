import { connect } from './index.common.js'

export * from './index.common.js'

const GRAPHQL_URL = process.env.GRAPHQL_URL || undefined
const CACHE_SIZE = process.env.SCHEDULER_UTILS_CACHE_SIZE || undefined
const FOLLOW_REDIRECTS = process.env.SCHEDULER_UTILS_FOLLOW_REDIRECTS === 'true' || undefined

const { locate, validate, raw } = connect({ GRAPHQL_URL, cacheSize: CACHE_SIZE, followRedirects: FOLLOW_REDIRECTS })

export { locate, validate, raw }
