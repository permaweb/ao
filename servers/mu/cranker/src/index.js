import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

import minimist from 'minimist'
import { z } from 'zod'
import { of } from 'hyper-async'
import cron from 'node-cron'
import PubSub from 'pubsub-js'

import { config } from './config.js'
import { createLogger } from './logger.js'
import { createApis } from './index.common.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const configSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  GATEWAY_URL: z.string(),
  UPLOADER_URL: z.string()
})

const logger = createLogger('cranker')
const apis = createApis({
  ...config,
  fetch,
  logger
})

const argv = minimist(process.argv.slice(2))
const processId = argv._[0]

const cursorFilePath = path.join(__dirname, '../cursor.txt')

let runTimeComplete = false

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
ct = cron.schedule('*/10 * * * * *', () => {
  if (runTimeComplete) {
    console.log('Runtime complete, exiting in 2 minutes')
    cron.schedule(getCronString(0, 2), () => {
      process.exit(1)
    })
    return
  }
  ct.stop() // pause cron while fetching messages
  const cursor = getCursor()
  apis.fetchCron({ apis, processId, cursor })
    .map(setCursor) // set cursor for next batch
    .map(publishCron)
    .fork(
      e => console.log(e),
      _success => { console.log('success', _success) }
    )
  ct.start() // resume cron when done getting messages
})

cron.schedule(getCronString(12), () => {
  console.log('12 hours reached, setting runtime to complete')
  runTimeComplete = true
})

PubSub.subscribe('MESSAGE', (_topic, data) => {
  return apis.processMsg({ resultMsg: data })
    .chain((res) => apis.fetchResult({
      processId: res.resultMsg.processId,
      txId: res.tx.id
    }))
    .map(publishResult)
    .fork(
      e => console.error(e),
      _r => {}
    )
})

PubSub.subscribe('SPAWN', (_topic, data) => {
  return of({ resultSpawn: data }).chain(apis.processSpawn)
    .fork(
      e => console.error(e),
      _r => {}
    )
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

function getCursor () {
  if (fs.existsSync(cursorFilePath)) {
    return fs.readFileSync(cursorFilePath, 'utf8')
  } else {
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
