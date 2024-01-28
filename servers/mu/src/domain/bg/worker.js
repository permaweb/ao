import { parentPort } from 'worker_threads'
import { of } from 'hyper-async'
import { z } from 'zod'

import { createApis, domainConfigSchema, createLogger, dataStoreClient, dbInstance } from '../index.js'
import { config } from '../../config.js'
import { tracerFor } from '../lib/tracer.js'

/**
 * a Worker which processes scheduled messages.
 * it uses an interval to tick every SCHEDULED_INTERVAL(from config)
 * and fetches all registered processes and detects if it
 * should crank scheduled messages for that process
 */

const logger = createLogger('ao-mu-worker')

const apiCtx = {
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger
}

const apis = createApis(apiCtx)

const monitorSchema = z.object({
  id: z.string(),
  authorized: z.boolean(),
  lastFromCursor: z.nullable(z.string()),
  processData: z.any(),
  createdAt: z.number(),
  lastRunTime: z.number().nullable()
})

const findLatestMonitors = dataStoreClient.findLatestMonitorsWith({ dbInstance, logger })
const saveMsg = dataStoreClient.saveMsgWith({ dbInstance, logger })
const saveSpawn = dataStoreClient.saveSpawnWith({ dbInstance, logger })
const findLatestMsgs = dataStoreClient.findLatestMsgsWith({ dbInstance, logger })
const findLatestSpawns = dataStoreClient.findLatestSpawnsWith({ dbInstance, logger })
const updateMonitor = dataStoreClient.updateMonitorWith({ dbInstance, logger })
const deleteMonitor = dataStoreClient.deleteMonitorWith({ dbInstance, logger })

/**
 * once started set the interval
 */
parentPort.on('message', (message) => {
  if (message.label === 'start') {
    // setInterval(() => {
    syncAndProcessMonitors()
      .then(
        _result => {},
        error => {
          console.log(`syncAndProcessMonitors error ${error}`)
        }
      )
    // }, config.SCHEDULED_INTERVAL)
    parentPort.postMessage('Monitor worker started')
  } else {
    parentPort.postMessage('Invalid message')
  }
})

/**
 * a list to track if a monitor is currently being processed
 * if it is we wont process it on this tick of the interval
 */
const runningMonitorList = []

async function syncAndProcessMonitors () {
  let monitorList = await findLatestMonitors()

  const toDelete = monitorList.filter((monitor) => shouldDelete(monitor))
  toDelete.map((monitor) => deleteMonitor({ id: monitor.id }))

  monitorList = await findLatestMonitors()

  /**
   * All the monitored processes that should run on this tick.
   * Based on tags and runningMonitorList
   */
  const runners = monitorList.filter((monitor) => {
    if (shouldRun(monitor)) {
      /**
       * The monitor is already in the process of running so filter it out.
       * It may have been running on a previous tick and is still in the process.
       */
      const index = runningMonitorList.findIndex(item => item.id === monitor.id)
      if (index !== -1) {
        return false
      }

      /**
       * it is going to run to push it into the list so it doesn't
       * get picked up on another tick of the interval before completing
       */
      runningMonitorList.push(monitor)
      return true
    }
    return false
  })

  processMonitors(runners)
    .then(
      _result => {
        runners.map((monitor) => removeMonitorFromRunningList(monitor.id))
      },
      error => {
        runners.map((monitor) => removeMonitorFromRunningList(monitor.id))
        console.log(`processMonitors error ${error}`)
      }
    )
}

async function processMonitors (monitorList) {
  for (const monitor of monitorList) {
    const validationResult = monitorSchema.safeParse(monitor)
    if (validationResult.success) {
      try {
        const { lastFromCursor } = await processMonitor(monitor)
        monitor.lastFromCursor = lastFromCursor
        monitor.lastRunTime = Date.now()
        await updateMonitor(monitor)
      } catch (error) {
        console.log(`Error processing monitor ${monitor.id}:`, error)
      }
    } else {
      console.log('Invalid monitor:', validationResult.error)
    }
  }

  return 'finished processing'
}

function removeMonitorFromRunningList (monitorId) {
  const index = runningMonitorList.findIndex(item => item.id === monitorId)
  if (index !== -1) {
    runningMonitorList.splice(index, 1)
  }
}

async function processMonitor (monitor) {
  try {
    const scheduled = await fetchScheduled(monitor)

    if (!scheduled || !scheduled.edges || (scheduled.edges.length < 1)) return { lastFromCursor: monitor.lastFromCursor }

    const fromTxId = `scheduled-${Math.floor(Math.random() * 1e18).toString()}`

    const msgSavePromises = []
    const spawnSavePromises = []

    // scheduled.edges is a list of result objects ({Messages, Spawns, Output})
    for (let i = 0; i < scheduled.edges.length; i++) {
      const messages = scheduled.edges[i].node.Messages
      const spawns = scheduled.edges[i].node.Spawns

      const msgPromises = messages.map(msg => {
        return saveMsg({
          id: Math.floor(Math.random() * 1e18).toString(),
          fromTxId,
          msg,
          cachedAt: new Date(),
          processId: monitor.id,
          initialTxId: null
        })
      })

      const spawnPromises = spawns.map(spawn => {
        return saveSpawn({
          id: Math.floor(Math.random() * 1e18).toString(),
          fromTxId,
          spawn,
          cachedAt: new Date(),
          processId: monitor.id,
          initialTxId: null
        })
      })

      msgSavePromises.push(...msgPromises)
      spawnSavePromises.push(...spawnPromises)
    }

    await Promise.all(msgSavePromises)
    await Promise.all(spawnSavePromises)

    if (msgSavePromises.length > 0) {
      const dbMsgs = await findLatestMsgs({ fromTxId })
      const tracer = tracerFor({
        message: { id: fromTxId },
        parent: undefined,
        from: monitor.processId
      })
      await of(dbMsgs)
        .map(dbMsgs => ({ msgs: dbMsgs, spawns: [], message: { id: fromTxId }, tracer, initialTxId: null }))
        .chain(res =>
          apis.crankMsgs(res)
            .bimap(
              logger.tap('Failed to crank messages'),
              logger.tap('Successfully cranked messages')
            )
        )
        .toPromise()
        .catch((error) => {
          console.log(error)
        })
    }

    if (spawnSavePromises.length > 0) {
      const dbSpawns = await findLatestSpawns({ fromTxId })
      for (let i = 0; i < dbSpawns.length; i++) {
        await of({ cachedSpawn: dbSpawns[i], initialTxId: null })
          .chain(apis.processSpawn)
          .toPromise()
          .catch((error) => {
            console.log(error)
          })
      }
    }

    const lastScheduled = scheduled.edges[scheduled.edges.length - 1]

    console.log('scheduled run complete')

    return { lastFromCursor: lastScheduled.cursor }
  } catch (e) {
    console.error('Error in processMonitor:', e)
    throw e
  }
}

async function fetchScheduled (monitor) {
  const lastFromCursor = monitor.lastFromCursor
  let requestUrl = `${config.CU_URL}/cron/${monitor.id}`

  if (lastFromCursor) {
    requestUrl = `${config.CU_URL}/cron/${monitor.id}?from=${lastFromCursor}`
  }

  let txt = ''

  try {
    const response = await fetch(requestUrl)

    const teedOff = response.body.tee()
    const r1 = new Response(teedOff[0])
    const r2 = new Response(teedOff[1])
    txt = await r1.text()

    const scheduled = await r2.json()
    return scheduled
  } catch (error) {
    console.log('Error in fetchScheduled:', error)
    console.log('for monitor: ')
    console.log(monitor)
    console.log('cu response')
    console.log(txt)
  }
}

/**
 * Should it run based on tags and the last time it ran.
 */
function shouldRun (monitor) {
  const tags = monitor.processData.tags
  const lastRunTime = monitor.lastRunTime
  if (!lastRunTime) return true
  const now = Date.now()

  const intervalTag = tags.find((tag) => tag.name === 'Cron-Interval')

  if (!intervalTag || !intervalTag.value) return false

  const [value, unit] = intervalTag.value.split('-')
  const intervalMilliseconds = convertToMilliseconds(parseInt(value, 10), unit)

  if (!intervalMilliseconds) return false

  return (now - lastRunTime) >= intervalMilliseconds
}

function convertToMilliseconds (value, unit) {
  switch (unit) {
    case 'seconds':
      return value * 1000
    case 'minutes':
      return value * 60 * 1000
    case 'hours':
      return value * 60 * 60 * 1000
    // add these cases back in later when we aren't deleting after 12 hours
    // case 'days':
    //   return value * 24 * 60 * 60 * 1000
    // case 'years':
    //   return value * 365 * 24 * 60 * 60 * 1000 // ignores leap years
    default:
      return null
  }
}

/**
 * If a monitor has been running for 12 hours we should delete it.
 * The user will have to resubscribe it
 */
function shouldDelete (monitor) {
  const createdAt = monitor.createdAt
  const now = Date.now()
  const intervalMilliseconds = 12 * 60 * 60 * 1000 // 12 hours
  return (now - createdAt) >= intervalMilliseconds
}
