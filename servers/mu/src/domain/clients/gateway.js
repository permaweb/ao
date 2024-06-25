import { backoff, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function isWalletWith ({
  fetch,
  histogram,
  GRAPHQL_URL,
  logger,
  setById,
  getById
}) {
  const walletFetch = withTimerMetricsFetch({
    fetch,
    histogram,
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

    logger(`id: ${id} not cached checking gateway for tx`)

    /*
      Only if this is actually a tx will this
      return true. That means if it doesnt its
      either a wallet or something else.
    */
    return backoff(
      () =>
        walletFetch(`${GRAPHQL_URL.replace('/graphql', '')}/${id}`, {
          method: 'HEAD'
        }).then(okRes),
      {
        maxRetries: 3,
        delay: 500,
        log: logger,
        name: `isWalletOnGateway(${id})`
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
