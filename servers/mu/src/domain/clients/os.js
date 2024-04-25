import { spawn, exec } from 'child_process'
import fs from 'fs'
import os from 'os'
import { Mutex } from 'async-mutex'

const mutex = new Mutex()

/*
  An in memory object storing operating system process
  ids by ao process ids
*/
const procs = {}

/*
  When the server starts we initialize the processes
  that were being monitored before from a file. If the
  file is persisted across deploys, then the monitors
  will start up again after deployment.
*/
function initProcsWith ({ PROC_FILE_PATH }) {
  return () => {
    if (!fs.existsSync(PROC_FILE_PATH)) return
    const data = fs.readFileSync(PROC_FILE_PATH, 'utf8')
    const obj = JSON.parse(data)
    /*
        start new os procs when the server starts because
        the server has either restarted or been redeployed.
      */
    Object.keys(obj).forEach(key => {
      const child = spawn('node', ['cranker/src/index.js', key], {
        stdio: ['ignore']
      })

      if (child && child.pid) {
        procs[key] = child.pid
        saveProcs(PROC_FILE_PATH).then(() => console.log(`Cron process started ${key} ${child.pid}`))
      } else {
        throw new Error('Failed to execute command')
      }
    })
  }
}

async function saveProcs (procFilePath) {
  await fs.promises.writeFile(procFilePath, JSON.stringify(procs), 'utf8')
}

function startMonitoredProcessWith ({ logger, PROC_FILE_PATH }) {
  return async ({ id }) => {
    logger('OS run ID:', id)
    const logFilePath = `${os.tmpdir()}/${id}.log`
    const out = fs.openSync(logFilePath, 'a')
    const err = fs.openSync(logFilePath, 'a')

    const release = await mutex.acquire()
    try {
      if (procs[id]) {
        throw new Error('Process already being monitored')
      }

      const child = spawn('node', ['cranker/src/index.js', id], {
        stdio: ['ignore', out, err]
      })

      if (child && child.pid) {
        logger(`Command executed with PID: ${child.pid}`)
        procs[id] = child.pid
        await saveProcs(PROC_FILE_PATH)
        return child.pid
      } else {
        logger('Failed to execute command')
        throw new Error('Failed to execute command')
      }
    } finally {
      release()
    }
  }
}

function killMonitoredProcessWith ({ logger, PROC_FILE_PATH }) {
  return async ({ id }) => {
    const release = await mutex.acquire()
    try {
      const proc = procs[id]
      if (proc) {
        try {
          await new Promise((resolve, reject) => {
            const killCommand = os.platform() === 'win32' ? `taskkill /PID ${proc} /T /F` : `kill ${proc}`
            exec(killCommand, (error) => {
              if (error) {
                reject(error)
              } else {
                logger(`Process with PID: ${proc} has been killed.`)
                delete procs[id]
                resolve()
              }
            })
          })
          await saveProcs(PROC_FILE_PATH)
        } catch (error) {
          logger('Error killing process:')
          logger(error)
          throw new Error('Error killing process')
        }
      } else {
        logger(`No process found for ID: ${id}`)
        throw new Error(`No process found for ID: ${id}`)
      }
    } finally {
      release()
    }
  }
}

export default {
  initProcsWith,
  startMonitoredProcessWith,
  killMonitoredProcessWith
}
