import { z } from 'zod'

import pouchDbClient from './clients/pouchdb.js'
import cuClient from './clients/cu.js'
import sequencerClient from './clients/sequencer.js'

import { initMsgsWith, processMsgWith, crankMsgsWith, processSpawnWith } from './lib/main.js'

const dbInstance = pouchDbClient.pouchDb('ao-cache')

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

  const processMsg = processMsgWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger }),
    findLatestCacheTx: pouchDbClient.findLatestTxWith({ pouchDb: dbInstance }),
    cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger }),
    findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL }),
    writeSequencerTx: sequencerClient.writeInteractionWith({ SEQUENCER_URL }),
    buildAndSign: sequencerClient.buildAndSignWith({ MU_WALLET }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger }),
    saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger }),
    updateMsg: pouchDbClient.updateMsgWith({ pouchDb: dbInstance, logger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger }),
    findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger }),
    logger
  })

  const processSpawn = processSpawnWith({
    logger,
    writeContractTx: sequencerClient.writeContractTxWith({ SEQUENCER_URL, MU_WALLET })
  })

  const initMsgs = initMsgsWith({
    selectNode: cuClient.selectNodeWith({ CU_URL, logger }),
    findLatestCacheTx: pouchDbClient.findLatestTxWith({ pouchDb: dbInstance }),
    cacheTx: pouchDbClient.saveTxWith({ pouchDb: dbInstance, logger }),
    findSequencerTx: sequencerClient.findTxWith({ SEQUENCER_URL }),
    writeSequencerTx: sequencerClient.writeInteractionWith({ SEQUENCER_URL }),
    fetchResult: cuClient.resultWith({ fetch, CU_URL, logger }),
    saveMsg: pouchDbClient.saveMsgWith({ pouchDb: dbInstance, logger }),
    saveSpawn: pouchDbClient.saveSpawnWith({ pouchDb: dbInstance, logger }),
    findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: dbInstance, logger }),
    findLatestSpawns: pouchDbClient.findLatestSpawnsWith({ pouchDb: dbInstance, logger }),
    logger
  })

  const crankMsgs = crankMsgsWith({
    processMsg,
    processSpawn,
    logger
  })

  return { initMsgs, crankMsgs }
}
