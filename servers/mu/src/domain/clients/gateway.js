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
    })
  })

  return async (id) => {
    logger(`Checking if id is a wallet ${id}`)

    const cachedIsWallet = await getById(id)

    if (cachedIsWallet !== null && cachedIsWallet !== undefined) {
      logger(`Found id: ${id} in cache with value: ${cachedIsWallet.isWallet}`)
      return cachedIsWallet.isWallet
    }

    logger(`id: ${id} not cached checking arweave for tx`)

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
