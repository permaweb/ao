import { config } from '../../config.js'
import { logger } from '../../logger.js'
import { createApis, domainConfigSchema } from '../../domain/index.js'

const customSuMode = true
/**
 * TODO: probably a better place to expose
 * this,
 * but this works for now
 */
const customFetch = async (input, init, custom = true) => {
  if (!custom) return await fetch(input, init)
  let url = new URL(input)
  if (input.includes('https://su-router')) {
    url = 'http://localhost:9001' + url.pathname + url.search
  // } else if (input.includes('https://su')) {
  //   url = 'http://localhost:9000' + url.pathname + url.search
  // } else if (input.includes('https://cu')) {
  //   url = 'http://localhost:6363' + url.pathname + url.search
  } else {
    url = input
  }
  console.log({ input, init, custom, url })
  return await fetch(url, init)
}

export const domain = {
  /**
   * Ensure server lvl config is never exposed to domain,
   * by simply parsing it out
   */
  ...(domainConfigSchema.parse(config)),
  fetch: customSuMode ? customFetch : fetch,
  logger
}
domain.apis = await createApis(domain)

/**
 * A middleware that exposes the domain business logic to a request
 * by attaching each api underneath the 'domain' field on the Request object
 *
 * This allows routes to be encapsulated and easily testable with unit tests
 */
export const withDomain = (handler) => (req, res) => {
  req.domain = domain
  return handler(req, res)
}
