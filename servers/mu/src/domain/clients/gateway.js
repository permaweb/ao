import { backoff, joinUrl, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function isWalletWith ({
  fetch,
  histogram,
  ARWEAVE_URL,
  logger,
  setById,
  getById
}) {
  const walletFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'isWallet'
    }),
    logger
  })

  return async (id, logId) => {
    logger({ log: `Checking if id is a wallet ${id}`, logId })

    const cachedIsWallet = await getById(id)

    if (cachedIsWallet !== null && cachedIsWallet !== undefined) {
      logger({ log: `Found id: ${id} in cache with value: ${cachedIsWallet.isWallet}`, logId })
      return cachedIsWallet.isWallet
    }

    logger({ log: `id: ${id} not cached checking arweave for tx`, logId })

    /*
      Only if this is actually a tx will this
      return true. That means if it doesnt its
      either a wallet or something else.
    */
    return backoff(
      () =>
        walletFetch(joinUrl({ url: ARWEAVE_URL, path: `/${id}` }), { method: 'HEAD' })
          .then(okRes),
      {
        maxRetries: 3,
        delay: 500,
        log: logger,
        logId,
        name: `isWallet(${id})`
      }
    )
      .then((res) => {
        return setById(id, { isWallet: !res.ok }).then(() => {
          return !res.ok
        })
      })
      .catch((_err) => {
        return setById(id, { isWallet: true }).then(() => {
          return true
        })
      })
  }
}

export default {
  isWalletWith
}
