import warpArBundles from 'warp-arbundles'
import { connect as schedulerUtilsConnect } from '@permaweb/ao-scheduler-utils'

import { fromPromise } from 'hyper-async'

import cuClient from './clients/cu.js'
import schedulerClient from './clients/scheduler.js'
import signerClient from './clients/signer.js'
import uploaderClient from './clients/uploader.js'

import { processMsgWith } from './lib/processMsg/index.js'
import { processSpawnWith } from './lib/processSpawn/index.js'

const { DataItem } = warpArBundles

const createDataItem = (raw) => new DataItem(raw)

/**
 * initialize the library functions and inject dependences
 */

export const createApis = (ctx) => {
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET
  const UPLOADER_URL = ctx.UPLOADER_URL

  const { locate, raw } = schedulerUtilsConnect({ cacheSize: 100, GRAPHQL_URL: ctx.GRAPHQL_URL })

  const logger = ctx.logger

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    createDataItem,
    locateScheduler: raw,
    locateProcess: locate,
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: processMsgLogger }),
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    logger,
    writeDataItemArweave: uploaderClient.uploadDataItemWith({ UPLOADER_URL, logger: processMsgLogger, fetch })
  })

  const fetchCron = fromPromise(cuClient.fetchCronWith({ CU_URL }))
  const fetchResultLogger = logger.child('fetchResult')
  const fetchResult = fromPromise(cuClient.resultWith({ fetch, CU_URL, logger: fetchResultLogger }))

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    locateScheduler: raw,
    locateProcess: locate,
    buildAndSign: signerClient.buildAndSignWith({ MU_WALLET, logger: processMsgLogger }),
    writeDataItem: schedulerClient.writeDataItemWith({ fetch, logger: processSpawnLogger })
  })

  return { processMsg, fetchCron, fetchResult, processSpawn }
}
