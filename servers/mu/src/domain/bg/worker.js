import { parentPort } from 'worker_threads'
import { of } from 'hyper-async'
import { z } from 'zod'

import { createApis, domainConfigSchema, createLogger } from '../index.js'
import { config } from '../../config.js'
import { dataStoreClient } from '../index.js'
import { dbInstance } from '../index.js'

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

let apis = createApis(apiCtx)

const monitorSchema = z.object({
  id: z.string(),
  authorized: z.boolean(),
  lastFromSortKey: z.nullable(z.string()), 
  interval: z.string(), 
  block: z.any(),
  createdAt: z.number(), 
});

const findLatestMonitors = dataStoreClient.findLatestMonitorsWith({dbInstance, logger})
const saveMsg = dataStoreClient.saveMsgWith({dbInstance, logger})
const findLatestMsgs = dataStoreClient.findLatestMsgsWith({dbInstance, logger})
const updateMonitor = dataStoreClient.updateMonitorWith({dbInstance, logger})

/**
 * once started set the interval
 */
parentPort.on('message', (message) => {
  if(message.label === 'start') {
    setInterval(() => {
      processMonitors()
        .then(
            _result => {},
            error => {
              console.log(`processMonitors error ${error}`)
            }
        )
    }, config.SCHEDULED_INTERVAL)
    parentPort.postMessage(`Monitor worker started`)
  } else {
    parentPort.postMessage(`Invalid message`)
  }
})



/**
 * a list to track if a monitor is currently being processed
 * if it is we wont process it on this tick of the interval
 */
let runningMonitorList = []

async function processMonitors() {
  try {
    let monitorList = await findLatestMonitors();
  
    for (const monitor of monitorList) {
      const validationResult = monitorSchema.safeParse(monitor);
      if (validationResult.success) {
        if (shouldRun(monitor)) {
          try {
            await processMonitor(monitor);
            removeMonitorFromRunningList(monitor.id);
          } catch (error) {
            removeMonitorFromRunningList(monitor.id);
            console.log(`Error processing monitor ${monitor.id}:`, error);
          }
        }
      } else {
        console.log('Invalid monitor:', validationResult.error);
      }
    }

    return 'finished processing'
  } catch(e) {
    throw e
  }
}

function removeMonitorFromRunningList(monitorId) {
  const index = runningMonitorList.findIndex(item => item.id === monitorId);
  if (index !== -1) {
    runningMonitorList.splice(index, 1);
  }
}

/**
 * Asynchronously fetches scheduled data for a given monitor.
 * The function makes a GET request to a URL constructed from the monitor's ID.
 * If the monitor has a 'lastFromSortKey', it is included as a query parameter in the request URL.
 * 
 * @param {Object} monitor - The monitor object containing the necessary information for the request.
 * @param {string} monitor.id - The unique identifier of the monitor.
 * @param {string} [monitor.lastFromSortKey] - Optional sort key indicating the starting point for fetching data.
 * 
 * @returns {Promise<Object>} A promise that resolves to the fetched scheduled data.
 * If an error occurs during fetching, logs the error and monitor details to the console.
 */
async function fetchScheduled(monitor) {
  let lastFromSortKey = monitor.lastFromSortKey;
  let requestUrl = `${config.CU_URL}/scheduled/${monitor.id}`;

  if (lastFromSortKey) {
    requestUrl = `${config.CU_URL}/scheduled/${monitor.id}?from=${lastFromSortKey}`;
  }

  try {
    let response = await fetch(requestUrl);
    let scheduled = await response.json();
    return scheduled;
  } catch (error) {
    console.log('Error in fetchScheduled:', error);
    console.log('for monitor: ')
    console.log(monitor)
  }
}


/**
 * Asynchronously processes a given monitor object. The function includes several steps:
 * 1. Adding the monitor to a running monitor list.
 * 2. Fetching scheduled data for the monitor.
 * 3. If scheduled data exists, generating a unique transaction ID and saving each message
 *    after removing its 'scheduledSortKey'.
 * 4. Fetching the latest messages from the database using the generated transaction ID.
 * 5. Processing these messages through an external API.
 * 6. Updating the monitor with the sort key of the last scheduled message.
 * 
 * @param {Object} monitor - The monitor object to be processed.
 * @returns {Promise<Object>} A promise that resolves to an object indicating the status
 */
async function processMonitor(monitor) {
    runningMonitorList.push(monitor)

    try {
      let scheduled = await fetchScheduled(monitor)

      if(!scheduled || scheduled.length < 1) return [];
  
      let fromTxId = `scheduled-${Math.floor(Math.random() * 1e18).toString()}`
  
      const savePromises = scheduled.map(msg => {
        const msgWithoutScheduledSortKey = { ...msg };
        delete msgWithoutScheduledSortKey.scheduledSortKey;
        return saveMsg({
          id: Math.floor(Math.random() * 1e18).toString(),
          fromTxId: fromTxId,
          msg: msgWithoutScheduledSortKey,
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
  
      let lastScheduled = scheduled[scheduled.length - 1]
  
      monitor.lastFromSortKey = lastScheduled.scheduledSortKey
  
      await updateMonitor(monitor)
  
      return {status: 'ok'}
    } catch(e) {
      console.error('Error in processMonitor:', e);
      throw e; 
    }
    
}

/**
 * determine if we should crank scheduled for this monitor record
 * 
 * @param {Object} monitor 
 * @returns {boolean}
 */
function shouldRun(monitor) {
  const index = runningMonitorList.findIndex(item => item.id === monitor.id);
  
  if (index !== -1) {
    return false; 
  }

  return true; 
}



