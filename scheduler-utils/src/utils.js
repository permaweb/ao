export function trimSlash (str = '') {
  str = str.trim()
  return str.endsWith('/') ? trimSlash(str.slice(0, -1)) : str
}

/**
 * A function that, given a function, will immediately invoke it,
 * then retry it on errors, using an exponential backoff.
 *
 * If the final retry fails, then the overall Promise is rejected
 * with that error
 *
 * @param {function} fn - the function to be called
 * @param {{ maxRetries: number, delay: number }} param1 - the number of total retries and increased delay for each try
 */
export const backoff = (
  fn,
  { maxRetries = 0, delay = 300 }
) => {
  /**
   * Recursive function that recurses with exponential backoff
   */
  const action = (retry, delay) => {
    return Promise.resolve()
      .then(fn)
      .catch((err) => {
        // Reached max number of retries
        if (retry >= maxRetries) {
          return Promise.reject(err)
        }

        /**
         * increment the retry count Retry with an exponential backoff
         */
        const newRetry = retry + 1
        const newDelay = delay + delay
        /**
         * Retry in {delay} milliseconds
         */
        return new Promise((resolve) => setTimeout(resolve, delay))
          .then(() => action(newRetry, newDelay))
      })
  }

  return action(0, delay)
}

/**
 * Checks if a response is OK. Otherwise, throw response.
 *
 * @param {Response} res - The response to check
 * @returns
 */
export const okRes = (res) => {
  if (res.ok) return res
  throw res
}
