import bodyParser from 'body-parser'

import errors from './errors/errors.js'
import msgProcessor from './messages/processor.js'
import validateWrite from './validation/write.js'
import createLogger from './logger/logger.js'

import pouchDbClient from './clients/pouchdb.js'
import cuClient from './clients/cu.js'
import sequencerClient from './clients/sequencer.js'

const logger = createLogger('@permaweb/ao/servers/mu')

const db = {
  saveTx: pouchDbClient.saveTxWith({ pouchDb: pouchDbClient.pouchDb, logger }),
  findLatestTx: pouchDbClient.findLatestTxWith({ pouchDb: pouchDbClient.pouchDb }),
  saveMsg: pouchDbClient.saveMsgWith({ pouchDb: pouchDbClient.pouchDb, logger }),
  findLatestMsgs: pouchDbClient.findLatestMsgsWith({ pouchDb: pouchDbClient.pouchDb }),
  updateMsg: pouchDbClient.updateMsgWith({ pouchDb: pouchDbClient.pouchDb, logger })
}

function injectDomain (req, _res, next) {
  req.domain = {}
  req.domain.db = db
  req.domain.msgProcessor = msgProcessor
  req.domain.validateWrite = validateWrite
  req.domain.cuClient = cuClient
  req.domain.sequencerClient = sequencerClient
  next()
}

const mountMiddlewares = (app) => [
  bodyParser.json(),
  bodyParser.urlencoded({ extended: false }),
  injectDomain,
  errors
].reduce(
  (app, middleware) => app.use(middleware),
  app
)

export default mountMiddlewares
