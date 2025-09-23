import { backoff, joinUrl, okRes } from '../utils.js'
import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'

function isWalletWith ({
  fetch,
  histogram,
  getProcess,
  ARWEAVE_URL,
  SU_ROUTER_URL,
  HB_ROUTER_URL,
  ENABLE_HB_WALLET_CHECK,
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
   * 4-step process: 1. Check SU router, 2. Check HyperBeam, 3. Check Arweave, 4. Check GraphQL
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

    logger({ log: `id: ${id} not cached, starting 4-step check`, logId })

    // Step 1: Check SU router
    try {
      logger({ log: `Step 1: Checking SU router for process ${id}`, logId })
      const suResponse = await walletFetch(`${SU_ROUTER_URL}/processes/${id}`)
      if (suResponse.ok) {
        logger({ log: `Found process in SU router for ${id}`, logId })
        return setById(id, { isWallet: false }).then(() => false)
      }
    } catch (err) {
      logger({ log: `Step 1: SU router check failed for ${id}: ${err.message}`, logId })
    }

    // Step 2: Check HyperBeam
    if (ENABLE_HB_WALLET_CHECK) {
      try {
        logger({ log: `Step 2: Checking HyperBeam for process ${id}`, logId })
        const hyperbeamResponse = await walletFetch(`${HB_ROUTER_URL}/${id}~meta@1.0/info/serialize~json@1.0`)
        if (hyperbeamResponse.status === 200) {
          logger({ log: `Found process in HyperBeam for ${id}`, logId })
          return setById(id, { isWallet: false }).then(() => false)
        }
      } catch (err) {
        logger({ log: `Step 2: HyperBeam check failed for ${id}: ${err.message}`, logId })
      }
    } else {
      logger({ log: `Step 2: Skipping HyperBeam check for ${id}`, logId })
    }

    // Step 3: Check Arweave
    try {
      logger({ log: `Step 3: Checking Arweave for ${id}`, logId })
      const arweaveResponse = await backoff(
        () =>
          walletFetch(joinUrl({ url: ARWEAVE_URL, path: `/${id}` }), { method: 'HEAD' })
            .then(okRes),
        {
          maxRetries: 3,
          delay: 200,
          log: logger,
          logId,
          name: `isWallet(${id})`
        }
      )

      if (arweaveResponse.ok) {
        logger({ log: `Found transaction in Arweave for ${id}`, logId })
        return setById(id, { isWallet: false }).then(() => false)
      }
    } catch (err) {
      logger({ log: `Step 3: Arweave check failed for ${id}: ${err.message}`, logId })
    }

    // Step 4: Check GraphQL
    try {
      logger({ log: `Step 4: Checking GraphQL for ${id}`, logId })
      const process = await getProcess(id)
      if (process && process?.id) {
        logger({ log: `Found process in GraphQL for ${id}`, logId })
        return setById(id, { isWallet: false }).then(() => false)
      }
    } catch (err) {
      logger({ log: `Step 4: GraphQL check failed for ${id}: ${err.message}`, logId })
    }

    // If no process found in any step, it's a wallet
    logger({ log: `No process found in any step for ${id}, treating as wallet`, logId })
    return setById(id, { isWallet: true }).then(() => true)
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

/**
 * Checks if a process is a HyperBeam process.
 *
 * @param {string} processId - The process to check
 * @returns {Promise<boolean>} - Whether the process is a HyperBeam process
 */
export const isHyperBeamProcessWith = ({
  getProcess,
  logger,
  getIsHyperBeamProcess,
  setIsHyperBeamProcess
}) => {
  return async (processId, logId) => {
    const cached = await getIsHyperBeamProcess(processId)
    if (cached) {
      logger({ log: `Found cached isHyperBeam state for process ${processId} cached: ${cached?.isHyperBeam}`, logId })
      return cached.isHyperBeam
    }
    logger({ log: `No cached isHyperBeam state for process ${processId}, fetching from GQL`, logId })

    const process = await getProcess(processId)
    if (!process) return false
    const variant = process.tags.find(t => t.name === 'Variant' || t.name === 'variant')?.value
    if (!variant) return false
    const isHyperBeam = variant === 'ao.N.1'
    logger({ log: `Caching isHyperBeamProcess for process ${processId} with value ${isHyperBeam}`, logId })
    await setIsHyperBeamProcess(processId, { isHyperBeam })
    return isHyperBeam
  }
}

export default {
  isWalletWith,
  fetchTransactionDetailsWith,
  isHyperBeamProcessWith
}
