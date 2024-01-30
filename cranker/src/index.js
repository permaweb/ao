import minimist from 'minimist'
import { z } from 'zod'
import { of } from 'hyper-async'
import cron from 'node-cron'
import PubSub from 'pubsub-js'

import { config } from './config.js'
import { createLogger } from './logger.js'
import { createApis } from './index.common.js'

export const configSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any()),
  GATEWAY_URL: z.string(),
  UPLOADER_URL: z.string()
})

const logger = createLogger('cranker logger')
const apis = createApis({
  ...config,
  fetch,
  logger
})

const argv = minimist(process.argv.slice(2))

const processId = argv[0] || 'ZHcPSyTkspHQTLBnJJwyQsSdqz2TulWEGvO4IsW74Tg'

let cursor = null // eslint-disable-line

let ct = null
ct = cron.schedule('*/1 * * * * *', () => {
  ct.stop() // pause cron while fetching messages
  apis.fetchCron({ apis, processId })
    .map(setCursor) // set cursor for next batch
    .map(publish)
    .fork(
      e => console.log(e),
      success => console.log(success)
    )
  ct.start() // resume cron when done getting messages
})

PubSub.subscribe('MESSAGE', (_topic, data) => {
  return of({ resultMsg: data }).chain(apis.processMsg)
    .fork(
      e => console.error(e),
      r => console.log(r)
    )
})

PubSub.subscribe('SPAWN', (msg, data) => {
  console.log(msg, data)
})

function publish (result) {
  result.edges.forEach(function (edge) {
    edge.node?.Messages?.map(msg => PubSub.publish('MESSAGE', { ...msg, processId }))
    edge.node?.Spawns?.map(spawn => PubSub.publish('SPAWN', { ...spawn, processId }))
  })
  return result
}

function setCursor (result) {
  cursor = result.edges[result.edges.length - 1].cursor
  // TODO: Save to File
  return result
}
