import { z } from 'zod'
import warpArBundles from 'warp-arbundles'

import pouchDbClient from './clients/pouchdb.js'
import cuClient from './clients/cu.js'
import sequencerClient from './clients/sequencer.js'

import { initMsgsWith, processMsgWith, crankMsgsWith, processSpawnWith } from './lib/main.js'

const { DataItem } = warpArBundles

const dbInstance = pouchDbClient.pouchDb('ao-cache')
const createDataItem = (raw) => new DataItem(raw)

export { createLogger } from './logger.js'

export const domainConfigSchema = z.object({
  SEQUENCER_URL: z.string().url('SEQUENCER_URL must be a a valid URL'),
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  MU_WALLET: z.record(z.any())
})

export const createApis = (ctx) => {
  const SEQUENCER_URL = ctx.SEQUENCER_URL
  const CU_URL = ctx.CU_URL
  const MU_WALLET = ctx.MU_WALLET

  const logger = ctx.logger
  const fetch = ctx.fetch

  const initMsgsLogger = logger.child('initMsgs')
  const initMsgs = initMsgsWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: initMsgsLogger }),
    createDataItem,
    cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL }),
    writeSequencerTx: sequencerClient.writeMessageWith({ SEQUENCER_URL }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: initMsgsLogger }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger: initMsgsLogger }),
    logger: initMsgsLogger
  })

  const processMsgLogger = logger.child('processMsg')
  const processMsg = processMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger: processMsgLogger }),
    createDataItem,
    cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL }),
    writeSequencerTx: sequencerClient.writeMessageWith({ SEQUENCER_URL }),
    buildAndSign: sequencerClient.buildAndSignWith({ MU_WALLET }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger: processMsgLogger }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    updateMsg: pouchDbClient.updateMsgWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger: processMsgLogger }),
    logger
  })

  const processSpawnLogger = logger.child('processSpawn')
  const processSpawn = processSpawnWith({
    logger: processSpawnLogger,
    writeContractTx: sequencerClient.writeContractTxWith({ SEQUENCER_URL, MU_WALLET })
  })

  const crankMsgsLogger = logger.child('crankMsgs')
  const crankMsgs = crankMsgsWith({
    processMsg,
    processSpawn,
    logger: crankMsgsLogger
  })

  return { initMsgs, crankMsgs }
}
