import { errFrom } from '../../domain/index.js'

/**
 * A middleware that simply calls the next handler in the chain.
 *
 * If no errors are thrown, then this middleware simply returns the response.
 * If an error is thrown, it is caught, logged, then used to respond to the request.
 *
 * This is useful for handling thrown errors, and prevents having to call
 * next explictly. Instead, a more idiomatic thrown error can be used in subsequent handlers
 */
export const withErrorHandler = (handler) => (req, res) => {
  return Promise.resolve()
    .then(() => handler(req, res))
    .catch((err) => {
      const { domain: { logger } } = req

      logger(err)
      const formatted = errFrom(err)
      if (res.writableEnded) return

      res.status(err.status || 500).json({ error: formatted.message || 'Internal Server Error' })
    })
}
