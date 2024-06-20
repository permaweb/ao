import { domainConfigSchema, config } from '../../config.js'
import { logger } from '../../logger.js'
import { createApis } from '../../domain/index.js'

const customSuMode = false
/**
 * A middleware that exposes the domain business logic to a request
 * by attaching each api underneath the 'domain' field on the Request object
 *
 * This allows routes to be encapsulated and easily testable with unit tests
 */

const customFetch = async (input, init) => {
  let url = new URL(input)
  if (input.includes('https://su-router')) {
    url = 'http://localhost:9001' + url.pathname + url.search
  // } else if (input.includes('https://su')) {
    // url = 'http://localhost:9000' + url.pathname + url.search
  // } else if (input.includes('https://cu')) {
  //   url = 'http://localhost:6363' + url.pathname + url.search
  } else {
    url = input
  }
  const res = await fetch(url, { ...init, redirect: 'manual' })
  console.log({ input, res })
  return res
}

export const domain = {
  ...(domainConfigSchema.parse(config)),
  fetch: customSuMode ? customFetch : fetch,
  logger
}

domain.apis = await createApis(domain)

export const withDomain = (handler) => (req, res) => {
  req.logger = logger
  req.domain = domain
  return handler(req, res)
}
