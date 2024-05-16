import fs from 'fs'
import path from 'path'

import minimist from 'minimist'
import cron from 'node-cron'
import PubSub from 'pubsub-js'

import { Resolved } from 'hyper-async'

import { domainConfigSchema, config } from '../config.js'
import { createApis, createLogger } from '../domain/index.js'

const logger = createLogger('cron')
export const domain = {
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger
}
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
let isProcessingAssigns = false
const messageQueue = []
const spawnQueue = []
const assignQueue = []

const processMessageQueue = async () => {
  if (!isProcessingMessages) {
    isProcessingMessages = true
    while (messageQueue.length > 0) {
      await apis.processMsg({ cachedMsg: messageQueue.shift() })
        .map(publishResult)
        .bichain(
          e => {
            console.error(e)
            return Resolved()
          },
          r => {
            console.log(r)
            return Resolved(r)
          }
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
      await apis.processSpawn({ cachedSpawn: spawnQueue.shift() })
        .bichain(
          e => {
            console.error(e)
            return Resolved()
          },
          r => {
            console.log(r)
            return Resolved(r)
          }
        )
        .toPromise()
    }
    isProcessingSpawns = false
  }
}

const processAssignQueue = async () => {
  if (!isProcessingAssigns) {
    isProcessingAssigns = true
    while (assignQueue.length > 0) {
      await apis.processAssign(assignQueue.shift())
        .map(publishResult)
        .bichain(
          e => {
            console.error(e)
            return Resolved()
          },
          r => {
            console.log(r)
            return Resolved(r)
          }
        )
        .toPromise()
    }
    isProcessingAssigns = false
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

PubSub.subscribe('ASSIGN', (_topic, data) => {
  assignQueue.push(data)
  processAssignQueue()
})

function publishCron (result) {
  result.edges.forEach(function (edge) {
    edge.node?.Messages?.forEach(msg => PubSub.publish('MESSAGE', {
      msg,
      processId: msg.Target,
      initialTxId: null,
      fromProcessId: processId
    }))
    edge.node?.Spawns?.forEach(spawn => PubSub.publish('SPAWN', {
      spawn,
      processId,
      initialTxId: null
    }))
    edge.node?.Assignments?.forEach(assign => {
      assign.Processes?.forEach(pid => {
        PubSub.publish('ASSIGN', {
          assign: {
            txId: assign.Message,
            processId: pid,
            baseLayer: assign.BaseLayer === true ? '' : null,
            exclude: assign.Exclude && assign.Exclude.length > 0 ? assign.Exclude.join(',') : null
          },
          initialTxId: null
        })
      })
    })
  })
  return result
}

function publishResult (result) {
  result.msgs?.forEach(function (msg) {
    PubSub.publish('MESSAGE', msg)
  })
  result.spawns?.forEach(function (spawn) {
    PubSub.publish('SPAWN', spawn)
  })
  result.assigns?.forEach(function (assign) {
    assign.Processes?.forEach(pid => {
      PubSub.publish('ASSIGN', {
        assign: {
          txId: assign.Message,
          processId: pid,
          baseLayer: assign.BaseLayer === true ? '' : null,
          exclude: assign.Exclude && assign.Exclude.length > 0 ? assign.Exclude.join(',') : null
        },
        initialTxId: null
      })
    })
  })
  return result
}

async function getCursor () {
  if (fs.existsSync(cursorFilePath)) {
    return fs.readFileSync(cursorFilePath, 'utf8')
  }

  const latestResults = await fetch(`${config.CU_URL}/results/${processId}?sort=DESC&limit=1&processId=${processId}`)

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
