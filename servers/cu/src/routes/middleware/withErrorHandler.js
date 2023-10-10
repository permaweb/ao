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

      if (res.writableEnded) return
      return res.status(err.status || 500).send(err.message || 'Internal Server Error')
    })
}
