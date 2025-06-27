import { backoff, joinUrl, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function isWalletWith ({
  fetch,
  histogram,
  ARWEAVE_URL,
  GRAPHQL_URL,
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

  /**
   * @name isWallet
   * Given an id, check if it is a process or a wallet.
   * First, check the cache. Then, check Arweave.
   *
   * @param id - The id to check if it is a process or a wallet
   * @param logId - The logId to aggregate the logs by
   * @returns isWallet - If the id is a wallet, return true. Otherwise, return false.
   */
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
      return true. That means if it doesn't its
      either a wallet or something else.
    */
    return backoff(
      () =>
        walletFetch(joinUrl({ url: ARWEAVE_URL, path: `/${id}` }), { method: 'HEAD' })
          .then(okRes),
      {
        maxRetries: 4,
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
        logger({ log: `Arweave HEAD request failed for ${id}, trying GraphQL fallback`, logId })

        const query = `
          query GetTransactionByID($id: ID!) {
            transactions(
              tags: [
                {name:"Data-Protocol", values: ["ao"]},
                {name:"Type", values: ["Process"]}
              ]
              first: 100
              sort:HEIGHT_DESC
              ids:[$id]
            ) {
              edges {
                cursor
                node {
                  id 
                  data {
                    size
                  }
                  owner{
                    address
                  }
                  tags {
                    name 
                    value 
                  }
                  bundledIn {
                    id
                  }
                  signature
                  recipient
                }
              }
            }
          }
        `

        return fetch(GRAPHQL_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            variables: { id }
          })
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`GraphQL request failed: ${response.statusText}`)
            }
            return response.json()
          })
          .then(result => {
            const hasProcessTransaction = result.data?.transactions?.edges?.length > 0
            const isWallet = !hasProcessTransaction

            logger({ log: `GraphQL result for ${id}: ${hasProcessTransaction ? 'found process' : 'no process found'}, isWallet: ${isWallet}`, logId })

            return setById(id, { isWallet }).then(() => isWallet)
          })
          .catch(gqlError => {
            logger({ log: `GraphQL fallback also failed for ${id}, defaulting to wallet: ${gqlError.message}`, logId })
            return setById(id, { isWallet: true }).then(() => {
              return true
            })
          })
      })
  }
}

/**
 * @name fetchTransactionDetails
 * Fetches transaction details using the provided GraphQL query
 * from the Arweave search endpoint.
 *
 * @param {string[]} ids - The list of transaction IDs to query.
 * @param {function} fetch - The fetch implementation to use for HTTP requests.
 * @returns {Promise<object>} The GraphQL query result.
 */
function fetchTransactionDetailsWith ({ fetch, GRAPHQL_URL }) {
  return async (ids) => {
    const query = `
      query {
        transactions(ids: ${JSON.stringify(ids)}) {
          pageInfo {
            hasNextPage
          }
          edges {
            cursor
            node {
              id
              anchor
              signature
              recipient
              block {
                timestamp
              }
              owner {
                address
                key
              }
              fee {
                winston
                ar
              }
              quantity {
                winston
                ar
              }
              data {
                size
                type
              }
              tags {
                name
                value
              }
              block {
                id
                timestamp
                height
                previous
              }
              parent {
                id
              }
            }
          }
        }
      }
    `

    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch transaction details: ${response.statusText}`)
    }

    return response.json()
  }
}

export default {
  isWalletWith,
  fetchTransactionDetailsWith
}
