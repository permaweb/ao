import cron from 'node-cron'
import warpArBundles from 'warp-arbundles'

import { createSqliteClient, SCHEDULER_LOCATIONS, PROCESSES_TABLE } from './sqlite.js'

const { DataItem } = warpArBundles

const SCHEDULER_LOCATION_QUERY = `
  query GetSchedulerLocations($cursor: String) {
    transactions(
      tags: [
        { name: "Type", values: ["Scheduler-Location"] }
        { name: "Data-Protocol", values: ["ao"] }
      ],
      first: 100
      after: $cursor
    ) {
      edges {
        node {
          id
          owner {
            address
          }
          tags {
            name
            value
          }
          block {
            id
            height
            timestamp
          }
        }
        cursor
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

/**
 * Fetch all Scheduler-Location transactions from the Arweave GraphQL gateway,
 * deduplicate by owner address (keeping the latest by block height then timestamp),
 * and upsert them into the scheduler_locations sqlite table.
 */
async function fetchAndPopulate ({ GRAPHQL_URL, DB_URL, logger }) {
  logger({ log: `Fetching scheduler locations from ${GRAPHQL_URL}` })

  const db = await createSqliteClient({ url: `${DB_URL}.sqlite`, bootstrap: false })

  /**
   * Map of owner address -> { node, blockHeight, blockTimestamp }
   * We keep only the latest record per owner.
   */
  const schedulersByOwner = new Map()

  let cursor = null
  let hasNextPage = true
  let pageCount = 0
  let totalEdges = 0

  while (hasNextPage) {
    const variables = cursor ? { cursor } : {}

    const res = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: SCHEDULER_LOCATION_QUERY, variables })
    })

    if (!res.ok) {
      const body = await res.text()
      logger({ log: `GraphQL request failed with status ${res.status}: ${body}` })
      throw new Error(`GraphQL request failed with status ${res.status}: ${body}`)
    }

    const json = await res.json()
    const { edges, pageInfo } = json.data.transactions

    pageCount++
    totalEdges += edges.length

    for (const edge of edges) {
      const node = edge.node
      const ownerAddress = node.owner.address
      const blockHeight = node.block?.height ?? 0
      const blockTimestamp = node.block?.timestamp ?? 0

      const existing = schedulersByOwner.get(ownerAddress)

      if (
        !existing ||
        blockHeight > existing.blockHeight ||
        (blockHeight === existing.blockHeight && blockTimestamp > existing.blockTimestamp)
      ) {
        schedulersByOwner.set(ownerAddress, {
          node,
          blockHeight,
          blockTimestamp
        })
      }

      cursor = edge.cursor
    }

    hasNextPage = pageInfo.hasNextPage

    logger({ log: `Fetched page ${pageCount} with ${edges.length} edges (${totalEdges} total, ${schedulersByOwner.size} unique owners so far)` })
  }

  /**
   * Upsert each deduplicated scheduler location into the database.
   * schedulerData stores the full node payload as JSON (tags, id, block, etc.)
   */
  const statements = []
  for (const [ownerAddress, { node }] of schedulersByOwner) {
    statements.push({
      sql: `INSERT OR REPLACE INTO ${SCHEDULER_LOCATIONS} (schedulerAddress, schedulerData) VALUES (?, ?)`,
      parameters: [ownerAddress, JSON.stringify(node)]
    })
  }

  if (statements.length > 0) {
    await db.transaction(statements)
    logger({ log: `Upserted ${statements.length} scheduler locations into database` })
  } else {
    logger({ log: 'No scheduler locations found to upsert' })
  }
}

let singletonInstance = null
let singletonPromise = null

export async function schedulerLocationsWith ({ GRAPHQL_URL, ARWEAVE_URL, DB_URL, logger, worker = false }) {
  if (singletonInstance) return singletonInstance
  if (singletonPromise) return singletonPromise

  singletonPromise = (async () => {
    const schedLogger = logger.child('schedulerLocations')
    const db = await createSqliteClient({ url: `${DB_URL}.sqlite`, bootstrap: false })

    if (!worker) {
      await fetchAndPopulate({ GRAPHQL_URL, DB_URL, logger: schedLogger })
      cron.schedule('*/5 * * * *', async () => {
        schedLogger({ log: 'Running scheduled refresh of scheduler locations' })
        await fetchAndPopulate({ GRAPHQL_URL, DB_URL, logger: schedLogger }).catch((err) => {
          schedLogger({ log: `Error refreshing scheduler locations: ${err.message}` })
        })
      })
    } else {
      schedLogger({ log: 'Worker mode: skipping fetch and cron, reading from existing database' })
    }

    /**
     * Given a processId, find its Scheduler tag, resolve the scheduler's
     * URL via raw(), and return { url, address }.
     */
    async function locate (processId, schedulerHint) {
      let schedulerAddress = schedulerHint

      if (!schedulerAddress) {
        const process = await getProcess(processId)
        if (!process) {
          throw new Error(`Process not found: ${processId}`)
        }

        const schedulerTag = process.tags?.find((t) => t.name === 'Scheduler')
        if (!schedulerTag) {
          throw new Error(`No Scheduler tag found on process ${processId}`)
        }

        schedulerAddress = schedulerTag.value
      }

      const scheduler = await raw(schedulerAddress)
      if (!scheduler) {
        throw new Error(`Scheduler location not found for address ${schedulerAddress}`)
      }

      return { url: scheduler.url, address: schedulerAddress }
    }

    /**
     * Given a scheduler wallet address, look up its Url tag
     * from the scheduler_locations table.
     */
    async function raw (schedulerAddress) {
      const results = await db.query({
        sql: `SELECT schedulerData FROM ${SCHEDULER_LOCATIONS} WHERE schedulerAddress = ?`,
        parameters: [schedulerAddress]
      })

      if (!results.length) return undefined

      const node = JSON.parse(results[0].schedulerData)
      const urlTag = node.tags?.find((t) => t.name === 'Url')
      if (!urlTag) return undefined

      const url = urlTag.value.replace(/\/+$/, '')
      return { url }
    }

    /**
     * Fetch a process data item from Arweave, parse it via warp-arbundles,
     * and return its id and tags. Results are cached in the processes table.
     */
    async function getProcess (processId) {
      const cached = await db.query({
        sql: `SELECT processData FROM ${PROCESSES_TABLE} WHERE processId = ?`,
        parameters: [processId]
      })

      if (cached.length) {
        return JSON.parse(cached[0].processData)
      }

      const res = await fetch(`${ARWEAVE_URL}/raw/${processId}`)
      if (!res.ok) {
        schedLogger({ log: `Failed to fetch process ${processId} from Arweave: ${res.status}` })
        return undefined
      }

      const buffer = Buffer.from(await res.arrayBuffer())
      console.log(buffer)
      const dataItem = new DataItem(buffer)

      const process = {
        id: processId,
        tags: dataItem.tags,
        owner: dataItem.owner,
        anchor: dataItem.anchor,
        target: dataItem.target,
        signature: dataItem.signature
      }

      await db.run({
        sql: `INSERT OR REPLACE INTO ${PROCESSES_TABLE} (processId, processData) VALUES (?, ?)`,
        parameters: [processId, JSON.stringify(process)]
      })

      schedLogger({ log: `Fetched and cached process ${processId}` })

      return process
    }

    singletonInstance = {
      locate,
      raw,
      getProcess
    }

    return singletonInstance
  })()

  return singletonPromise
}
