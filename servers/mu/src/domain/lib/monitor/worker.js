import { parentPort } from 'worker_threads'
import { of } from 'hyper-async'
import { z } from 'zod'

import { createApis, domainConfigSchema, createLogger } from '../../index.js'
import { config } from '../../../config.js'
import { dataStoreClient } from '../../index.js'
import { dbInstance } from '../../index.js'

const logger = createLogger('ao-mu-worker')

const apiCtx = {
  ...(domainConfigSchema.parse(config)),
  fetch,
  logger
}

let apis = createApis(apiCtx)

const monitorSchema = z.object({
  id: z.string(),
  authorized: z.boolean(),
  lastFromSortKey: z.nullable(z.string()), 
  interval: z.string(), 
  block: z.any(),
  createdAt: z.number(), 
});

const monitorsListSchema = z.array(monitorSchema)

const findLatestMonitors = dataStoreClient.findLatestMonitorsWith({dbInstance, logger})
const saveMsg = dataStoreClient.saveMsgWith({dbInstance, logger})
const findLatestMsgs = dataStoreClient.findLatestMsgsWith({dbInstance, logger})

parentPort.on('message', (message) => {
  if(message.label === 'start') {
    setTimeout(() => processMonitors(), 1000)
    parentPort.postMessage(`Monitor worker started`)
  } else {
    parentPort.postMessage(`Invalid message`)
  }
})


async function processMonitors() {
  let monitorList = await findLatestMonitors()
  const validationResult = monitorsListSchema.safeParse(monitorList);
  if (!validationResult.success) {
    console.log(`Invalid monitor list for start`)
    parentPort.postMessage(`Invalid monitor list for start`)
    process.exit(1);
  } 
  monitorList.map((monitor) => {
      if(shouldRun(monitor)) {
        processMonitor(monitor).then((result) => {
            console.log(result)
        })
      }
  })
}

async function fetchScheduled(monitor) {
  let lastFromSortKey = monitor.lastFromSortKey;
    let requestUrl =`${config.CU_URL}/scheduled/${monitor.id}`
    if(lastFromSortKey) {
      requestUrl = `${config.CU_URL}/scheduled/${monitor.id}?from=${lastFromSortKey}`
    }
    let scheduled = await (await fetch(requestUrl)).json()
    return scheduled
}

async function processMonitor(monitor) {
    let scheduled = await fetchScheduled(monitor)
    let fromTxId = `scheduled-${Math.floor(Math.random() * 1e18).toString()}`

    const savePromises = scheduled.map(msg => {
      return saveMsg({
        id: Math.floor(Math.random() * 1e18).toString(),
        fromTxId: fromTxId,
        msg,
        cachedAt: new Date()
      })
    })

    await Promise.all(savePromises)
    let dbMsgs = await findLatestMsgs({fromTxId})

    await of(dbMsgs)
      .map(dbMsgs => ({ msgs: dbMsgs, spawns: [] }))
      .chain(res =>
        apis.crankMsgs(res)
          .bimap(
            logger.tap('Failed to crank messages'),
            logger.tap('Successfully cranked messages')
          )
      )
      .toPromise()

    return {status: 'ok'}
}


// TODO: check if it has been the interval amount 
// of time since the last run or the processes block
function shouldRun(_monitor) {
  return true
}



