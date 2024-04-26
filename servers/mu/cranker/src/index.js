import fs from 'fs'
import path from 'path'

import minimist from 'minimist'
import cron from 'node-cron'
import PubSub from 'pubsub-js'

import { config } from './config.js'
import { createLogger } from './logger.js'
import { createApis } from './index.common.js'

const logger = createLogger('cranker')
const apis = createApis({
  ...config,
  fetch,
  logger
})

const argv = minimist(process.argv.slice(2))
const processId = argv._[0]

const cursorFilePath = path.join(`${config.CRON_CURSOR_DIR}/${processId}-cursor.txt`)

const runTimeComplete = false

const getCronString = (hoursToAdd = 0, minutesToAdd = 0) => {
  const now = new Date()
  now.setHours(now.getHours() + hoursToAdd)
  now.setMinutes(now.getMinutes() + minutesToAdd)
  const minutes = now.getMinutes()
  const hours = now.getHours()
  const dayOfMonth = now.getDate()
  const month = now.getMonth() + 1
  return `${minutes} ${hours} ${dayOfMonth} ${month} *`
}

let ct = null
let isJobRunning = false
ct = cron.schedule('*/10 * * * * *', async () => {
  if (!isJobRunning) {
    isJobRunning = true
    if (runTimeComplete) {
      console.log('Runtime complete, exiting in 2 minutes')
      cron.schedule(getCronString(0, 2), () => {
        process.exit(1)
      })
      return
    }
    ct.stop() // pause cron while fetching messages
    const cursor = await getCursor()
    apis.fetchCron({ apis, processId, cursor })
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

let isProcessingMessages = false
let isProcessingSpawns = false
const messageQueue = []
const spawnQueue = []

const processMessageQueue = async () => {
  if (!isProcessingMessages) {
    isProcessingMessages = true
    while (messageQueue.length > 0) {
      await apis.processMsg({ resultMsg: messageQueue.shift() })
        .chain((res) => apis.fetchResult({
          processId: res.tx.processId,
          txId: res.tx.id
        }))
        .map(publishResult)
        .bimap(
          e => console.error(e),
          r => { console.log(r) }
        )
        .toPromise()
    }
    isProcessingMessages = false
  }
}

const processSpawnQueue = async () => {
  if (!isProcessingSpawns) {
    isProcessingSpawns = true
    while (spawnQueue.length > 0) {
      await apis.processSpawn({ resultSpawn: spawnQueue.shift() })
        .bimap(
          e => console.error(e),
          r => { console.log(r) }
        )
        .toPromise()
    }
    isProcessingSpawns = false
  }
}

PubSub.subscribe('MESSAGE', (_topic, data) => {
  messageQueue.push(data)
  processMessageQueue()
})

PubSub.subscribe('SPAWN', (_topic, data) => {
  spawnQueue.push(data)
  processSpawnQueue()
})

function publishCron (result) {
  result.edges.forEach(function (edge) {
    edge.node?.Messages?.map(msg => PubSub.publish('MESSAGE', { ...msg, processId }))
    edge.node?.Spawns?.map(spawn => PubSub.publish('SPAWN', { ...spawn, processId }))
  })
  return result
}

function publishResult (result) {
  result.Messages?.forEach(function (message) {
    PubSub.publish('MESSAGE', { ...message, processId })
  })
  result.Spawns?.forEach(function (spawn) {
    PubSub.publish('SPAWN', { ...spawn, processId })
  })
  return result
}

async function getCursor () {
  if (fs.existsSync(cursorFilePath)) {
    return fs.readFileSync(cursorFilePath, 'utf8')
  } else {
    const latestResults = await fetch(`${config.CU_URL}/results/${processId}?sort=DESC&limit=1&processId=${processId}`)
    const latestJson = await latestResults.json()
    if (latestJson?.edges?.length > 0) {
      return latestJson.edges[0].cursor
    }
    return null
  }
}

function setCursor (result) {
  const cursor = result.edges[result.edges.length - 1]?.cursor
  if (cursor) {
    fs.writeFileSync(cursorFilePath, cursor, 'utf8')
  }
  return result
}
