import { withTimerMetricsFetch } from '../lib/with-timer-metrics-fetch.js'
import { CRON_PROCESSES_TABLE } from './sqlite.js'
/**
 * cronsRunning stores the node cron response
 * which can be used to stop a cron that is running
 * but cannot be saved to a file.
 */
const cronsRunning = {}

/**
 * Save a processId in the cron processes database.
 * @param {{ processId: string }} processId - the processId to save
 */
export function saveCronProcessWith ({ db }) {
  return async ({ processId }) => {
    function createQuery ({ processId }) {
      return {
        sql: `
          INSERT OR IGNORE INTO ${CRON_PROCESSES_TABLE}
          (processId, status)
          VALUES (?, ?)
        `,
        parameters: [
          processId,
          'running'
        ]
      }
    }
    db.run(createQuery({ processId }))
  }
}

/**
 * Delete a processId from the cron processes database.
 * @param {{ processId: string }} processId - the processId to delete
 */
export function deleteCronProcessWith ({ db }) {
  return async ({ processId }) => {
    function createQuery ({ processId }) {
      return {
        sql: `
          DELETE FROM ${CRON_PROCESSES_TABLE}
          WHERE processId = ?
        `,
        parameters: [
          processId
        ]
      }
    }
    db.run(createQuery({ processId }))
  }
}

/**
 * Given a processId, retrieve its cursor
 * @param {{ processId: string }} processId - the processId to retrieve the cursor of
 * @returns the cron process's cursor
 */
export function getCronProcessCursorWith ({ db }) {
  return async ({ processId }) => {
    function createQuery ({ processId }) {
      return {
        sql: `
          SELECT cursor FROM ${CRON_PROCESSES_TABLE}
          WHERE processId = ?
        `,
        parameters: [
          processId
        ]
      }
    }
    return (await db.query(createQuery({ processId })))?.[0]?.cursor
  }
}

/**
 * Updates a cron process's cursor in the database
 * @param {{ processId: string }} processId - the processId to update the cursor of
 * @param {{ cursor: string }} cursor - the new cursor of the cron process
 */
export function updateCronProcessCursorWith ({ db }) {
  return async ({ processId, cursor }) => {
    function createQuery ({ processId, cursor }) {
      return {
        sql: `
          UPDATE ${CRON_PROCESSES_TABLE}
          SET cursor = ?
          WHERE processId = ?
        `,
        parameters: [
          cursor,
          processId
        ]
      }
    }
    db.run(createQuery({ processId, cursor }))
  }
}

function initCronProcsWith ({ startMonitoredProcess, getCronProcesses, getCronProcessCursor, updateCronProcessCursor, logger, STALE_CURSOR_RANGE }) {
  /**
   * Run upon server initialization.
   * Checks the database for cron processes. If found, clear stale cursors and start those processes.
   */
  return async () => {
    /**
     * If no cron processes are found, continue
     */
    const cronProcesses = await getCronProcesses()
    if (!cronProcesses) return

    /*
     * Clear stale cursors before starting processes
     */
    const staleThreshold = Date.now() - STALE_CURSOR_RANGE
    for (const { processId } of cronProcesses) {
      try {
        const cursor = await getCronProcessCursor({ processId })
        if (cursor) {
          try {
            const cursorData = JSON.parse(atob(cursor))
            const cursorTimestamp = parseInt(cursorData.timestamp)
            
            if (cursorTimestamp < staleThreshold) {
              logger({ log: `Clearing stale cursor for process ${processId} (older than configured range)` })
              await updateCronProcessCursor({ processId, cursor: null })
            } else {
              logger({ log: `Keeping fresh cursor for process ${processId}` })
            }
          } catch (error) {
            logger({ log: `Failed to parse cursor for process ${processId}, clearing it: ${error}` })
            await updateCronProcessCursor({ processId, cursor: null })
          }
        }
      } catch (e) {
        logger({ log: `Error checking cursor for process ${processId}: ${e}` })
      }
    }

    /*
     * Iterate through processes and start monitoring
     */
    for (const { processId } of cronProcesses) {
      try {
        await startMonitoredProcess({ processId })
      } catch (e) {
        console.log(`Error starting process monitor: ${e}`)
      }
    }
  }
}

function startMonitoredProcessWith ({ 
  fetch, 
  cron, 
  histogram, 
  logger, 
  CU_URL, 
  fetchCron, 
  crank, 
  monitorGauge, 
  saveCronProcess, 
  getCronProcessCursor, 
  updateCronProcessCursor,
  fetchTransactions,
  HB_GRAPHQL_URL
}) {
  const getCursorFetch = withTimerMetricsFetch({
    fetch,
    timer: histogram,
    startLabelsFrom: () => ({
      operation: 'getCursor'
    }),
    logger
  })
  async function getOwner({ processId }) {
    return fetchTransactions([processId])
      .then(res => res.data.transactions.edges[0].node.owner.address.jack.jack.jack)
      .then((owner) => {
        if (!owner) return null
        return owner
      })
  }
  /**
   * startMonitoredProcess
   * Given a process ID, begin monitoring it every 10 seconds
   *
   * @param processId - the process to monitor
   */
  return async ({ processId }) => {
    /**
     * If we have an existing cron running for this process,
     * throw an error to avoid double monitoring / overwriting
     */
    if (cronsRunning[processId]) {
      throw new Error('Process already being monitored')
    }

    const owner = await getOwner({ processId })
    let ct = null
    let isJobRunning = false
    ct = cron.schedule('*/10 * * * * *', async () => {
      if (!isJobRunning) {
        isJobRunning = true
        ct.stop() // pause cron while fetching messages
        const cursor = await getCursor()
        fetchCron({ processId, cursor })
          .map(setCursor) // set cursor for next batch
          .map(publishCron)
          .bimap(
            (res) => {
              isJobRunning = false
              return res
            },
            (res) => {
              isJobRunning = false
              return res
            }
          )
          .fork(
            e => console.log(e),
            _success => console.log('success', _success)
          )
        ct.start() // resume cron when done getting messages
      }
    })

    cronsRunning[processId] = ct

    /**
     * Once we have updated cronsRunning, save our processId in the db.
     */
    await saveCronProcess({ processId })
    monitorGauge.inc()

    function publishCron (result) {
      result.edges.forEach((edge) => {
        crank({
          msgs: edge.node?.Messages?.map(msg => ({
            msg,
            processId: msg.Target,
            initialTxId: null,
            fromProcessId: processId,
            wallet: owner,
            cron: true
          })),
          spawns: edge.node?.Spawns?.map(spawn => ({
            spawn,
            processId,
            initialTxId: null,
            wallet: owner,
            cron: true
          })),
          assigns: edge.node?.Assignments
        })
          .toPromise()
          .then((res) => {
            logger({ log: `Cron results sent to worker: ${res}` })
          }).catch((e) => {
            logger({ log: `Error sending cron results to worker ${e}` })
          })
      })
      return result
    }

    async function getCursor () {
      const cursor = await getCronProcessCursor({ processId })
      if (cursor) return cursor

      const latestResults = await getCursorFetch(`${CU_URL}/results/${processId}?sort=DESC&limit=1&processId=${processId}`)

      const latestJson = await latestResults.json()
        .catch(error => {
          console.log('Failed to parse results JSON:', error)
          return null
        })

      if (latestJson?.edges?.length > 0) {
        return latestJson.edges[0].cursor
      }

      return null
    }

    function setCursor (result) {
      const cursor = result.edges[result.edges?.length - 1]?.cursor
      if (cursor) {
        updateCronProcessCursor({ processId, cursor })
      }
      return result
    }
  }
}

function killMonitoredProcessWith ({ logger, monitorGauge, deleteCronProcess }) {
  /**
   * killMonitoredProcess
   * Given a process ID, stop monitoring it
   *
   * @param processId - the process to unmonitor
   */
  return async ({ processId }) => {
    const ct = cronsRunning[processId]
    if (!ct) {
      logger({ log: `Cron process not found: ${processId}` })
      throw new Error('Process monitor not found')
    }
    ct.stop()
    delete cronsRunning[processId]
    /**
     * Remove the processId from the cron processes db.
     */
    await deleteCronProcess({ processId })
    monitorGauge.dec()
    logger({ log: `Cron process stopped: ${processId}` })
  }
}

export default {
  initCronProcsWith,
  startMonitoredProcessWith,
  killMonitoredProcessWith
}
