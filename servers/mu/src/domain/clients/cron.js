import fs from 'fs'
import path from 'path'

import cron from 'node-cron'
import { Mutex } from 'async-mutex'

const mutex = new Mutex()
/**
 * cronsRunning stores the node cron response
 * which can be used to stop a cron that is running
 * but cannot be saved to a file.
 */
const cronsRunning = {}
/**
 * procesToSave will contain the same process ids as
 * the keys but will have a string as a value so it
 * can be saved to a file. It doesnt need to be an object
 * but to remain compatable with files out there it still
 * is an object.
 */
const procsToSave = {}
let isInit = false

async function saveProcs (procFilePath) {
  const release = await mutex.acquire()
  try {
    await fs.promises.writeFile(procFilePath, JSON.stringify(procsToSave), 'utf8')
  } finally {
    release()
  }
}

function initCronProcsWith ({ PROC_FILE_PATH, startMonitoredProcess }) {
  return async () => {
    if (isInit) return
    if (!fs.existsSync(PROC_FILE_PATH)) return
    const data = fs.readFileSync(PROC_FILE_PATH, 'utf8')

    /**
     * This .replace is used to fix corrupted json files
     * it should be removed later now that the corruption
     * issue is solved
     */
    const obj = JSON.parse(data.replace(/}\s*"/g, ',"'))

    /*
     * start new os procs when the server starts because
     * the server has either restarted or been redeployed.
     */
    for (const key of Object.keys(obj)) {
      await startMonitoredProcess(key)
    }

    await saveProcs(PROC_FILE_PATH)

    isInit = true
  }
}

function startMonitoredProcessWith ({ logger, CRON_CURSOR_DIR, CU_URL, fetchCron, crank, PROC_FILE_PATH }) {
  return async ({ processId }) => {
    const cursorFilePath = path.join(`${CRON_CURSOR_DIR}/${processId}-cursor.txt`)

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
            _success => { console.log('success', _success) }
          )
        ct.start() // resume cron when done getting messages
      }
    })

    cronsRunning[processId] = ct
    /**
     * We dont need an object here for procsToSave
     * anymore but to remain compatable with the
     * files already out there we're still using one.
     * Thats why here is just sending 'running'
     */
    procsToSave[processId] = 'running'
    await saveProcs(PROC_FILE_PATH)

    function publishCron (result) {
      result.edges.forEach((edge) => {
        crank({
          msgs: edge.node?.Messages?.map(msg => ({
            msg,
            processId: msg.Target,
            initialTxId: null,
            fromProcessId: processId
          })),
          spawns: edge.node?.Spawns?.forEach(spawn => ({
            spawn,
            processId,
            initialTxId: null
          })),
          assigns: edge.node?.Assignments
        })
          .toPromise()
          .then((res) => {
            logger(`Cron results sent to worker: ${res}`)
          }).catch((e) => {
            logger(`Error sending cron results to worker ${e}`)
          })
      })
      return result
    }

    async function getCursor () {
      if (fs.existsSync(cursorFilePath)) {
        return fs.readFileSync(cursorFilePath, 'utf8')
      }

      const latestResults = await fetch(`${CU_URL}/results/${processId}?sort=DESC&limit=1&processId=${processId}`)

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
      const cursor = result.edges[result.edges.length - 1]?.cursor
      if (cursor) {
        fs.writeFileSync(cursorFilePath, cursor, 'utf8')
      }
      return result
    }
  }
}

function killMonitoredProcessWith ({ logger, PROC_FILE_PATH }) {
  return async ({ processId }) => {
    const ct = cronsRunning[processId]
    ct.stop()
    delete cronsRunning[processId]
    delete procsToSave[processId]
    await saveProcs(PROC_FILE_PATH)
    logger(`Cron process stopped: ${processId}`)
  }
}

export default {
  initCronProcsWith,
  startMonitoredProcessWith,
  killMonitoredProcessWith
}
