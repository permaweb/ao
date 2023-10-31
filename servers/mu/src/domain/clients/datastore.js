import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, prop } from 'ramda'
import z from 'zod'


const cachedTxSchema = z.object({
  _id: z.string().min(1),
  data: z.any(),
  processId: z.string().min(1),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveTxWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('saveTx')

  return (tx) => {
    return of(tx)
      .map(applySpec({
        _id: prop('id'),
        data: prop('data'),
        processId: prop('processId'),
        cachedAt: prop('cachedAt')
      }))
      .map(cachedTxSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => dbInstance.getTx(doc._id)))
          .bichain(
            (err) => {
              if (err.status === 404) {
                logger(
                  'No cached document found with _id %s. Caching tx %O',
                  doc._id,
                  doc
                )
                return Resolved(undefined)
              }
              return Rejected(err)
            },
            Resolved
          )
          .chain((found) =>
            found
              ? of(found)
              : of(doc).chain(fromPromise((doc) => dbInstance.putTx(doc)))
                .bimap(
                  logger.tap('Encountered an error when caching tx'),
                  logger.tap('Cached tx')
                )
                .bichain(Resolved, Resolved)
          )
          .map(always(doc._id))
      )
      .toPromise()
  }
}

function findLatestTxWith (
  { dbInstance }
) {
  return ({ id }) => {
    return of({ txId: id })
      .chain(fromPromise(() => {
        return dbInstance.findTx(id).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .map(head)
      .chain((doc) => doc ? Resolved(doc) : Rejected(doc))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(cachedTxSchema.parse)
      .map(applySpec({
        id: prop('_id'),
        data: prop('data'),
        processId: prop('processId'),
        cachedAt: prop('cachedAt')
      }))
      .bichain(Resolved, Resolved)
      .toPromise()
  }
}

const cachedMsgSchema = z.object({
  _id: z.string().min(1),
  fromTxId: z.string().min(1),
  toTxId: z.string().min(1).nullable().optional(),
  msg: z.any(),
  type: z.literal('message'),
  _rev: z.string().optional(),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveMsgWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('saveMsg')
  return (msg) => {
    return of(msg)
      .map(applySpec({
        _id: prop('id'),
        fromTxId: prop('fromTxId'),
        msg: prop('msg'),
        type: always('message'),
        cachedAt: prop('cachedAt')
      }))
      .map(cachedMsgSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => dbInstance.putMsg(doc)))
          .bimap(
            logger.tap('Encountered an error when caching msg'),
            logger.tap('Cached msg')
          )
          .bichain(Resolved, Resolved)
          .map(always(doc._id))
      )
      .toPromise()
  }
}

function updateMsgWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('updateMsg')

  return ({ _id, toTxId }) => {
    return of({ _id })
      .chain(fromPromise(() => dbInstance.getMsg(_id)))
      .map(doc => ({ ...doc, toTxId }))
      .map(cachedMsgSchema.parse)
      .chain(updatedDoc =>
        of(updatedDoc)
          .chain(fromPromise(() => dbInstance.putMsg(updatedDoc)))
          .bimap(
            logger.tap('Encountered an error when updating msg'),
            logger.tap('Updated msg')
          )
          .bichain(Resolved, Resolved)
          .map(always(updatedDoc._id))
      )
      .toPromise()
  }
}

function findLatestMsgsWith ({ dbInstance }) {
  return ({ fromTxId }) => {
    return of({ fromTxId })
      .chain(fromPromise(() => {
        return dbInstance.findMsgs(fromTxId).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .chain((docs) => {
        if (docs.length === 0) {
          return Rejected('No documents found')
        }

        const parsedDocs = docs.map(doc => cachedMsgSchema.parse(doc))

        return Resolved(parsedDocs.map(doc => ({
          id: prop('_id', doc),
          fromTxId: prop('fromTxId', doc),
          toTxId: prop('toTxId', doc),
          msg: prop('msg', doc),
          cachedAt: prop('cachedAt', doc)
        })))
      })
      .toPromise()
  }
}

const cachedSpawnSchema = z.object({
  _id: z.string().min(1),
  fromTxId: z.string().min(1),
  toTxId: z.string().min(1).nullable().optional(),
  spawn: z.any(),
  type: z.literal('spawn'),
  _rev: z.string().optional(),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveSpawnWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('spawn')
  return (spawn) => {
    return of(spawn)
      .map(applySpec({
        _id: prop('id'),
        fromTxId: prop('fromTxId'),
        spawn: prop('spawn'),
        type: always('spawn'),
        cachedAt: prop('cachedAt')
      }))
      .map(cachedSpawnSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => dbInstance.putSpawn(doc)))
          .bimap(
            logger.tap('Encountered an error when caching spawn'),
            logger.tap('Cached spawn')
          )
          .bichain(Resolved, Resolved)
          .map(always(doc._id))
      )
      .toPromise()
  }
}

function findLatestSpawnsWith ({ dbInstance }) {
  return ({ fromTxId }) => {
    return of({ fromTxId })
      .chain(fromPromise(() => {
        return dbInstance.findSpawns(fromTxId).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .chain((docs) => {
        if (docs.length === 0) {
          return Rejected('No documents found')
        }

        const parsedDocs = docs.map(doc => cachedSpawnSchema.parse(doc))

        return Resolved(parsedDocs.map(doc => ({
          id: prop('_id', doc),
          fromTxId: prop('fromTxId', doc),
          toTxId: prop('toTxId', doc),
          spawn: prop('spawn', doc),
          cachedAt: prop('cachedAt', doc)
        })))
      })
      .toPromise()
  }
}


const monitoredProcessSchema = z.object({
  _id: z.string().min(1),
  // is this monitored process authorized to run by the server (is it funded)
  authorized: z.boolean(),
  lastFromSortKey: z.string().optional().nullable(),
  type: z.literal('monitor'),
  interval: z.string().min(1),
  block: z.any(),
  _rev: z.string().optional(),
  createdAt: z.number()
})

function saveMonitoredProcessWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('saveMonitoredProcess')
  return (process) => {
    return of(process)
      .map(applySpec({
        _id: prop('id'),
        authorized: prop('authorized'),
        lastFromSortKey: prop('lastFromSortKey'),
        type: always('monitor'),
        interval: prop('interval'),
        block: prop('block'),
        createdAt: prop('createdAt')
      }))
      .map(monitoredProcessSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => dbInstance.putMonitor(doc)))
          .bimap(
            logger.tap('Encountered an error when caching monitored process'),
            logger.tap('Cached monitor')
          )
          .bichain(Resolved, Resolved)
          .map(always(doc._id))
      )
      .toPromise()
  }
}

function findLatestMonitorsWith ({ dbInstance }) {
  return () => {
    return of({})
      .chain(fromPromise(() => {
        return dbInstance.findMonitors().then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .chain((docs) => {
        if (docs.length === 0) {
          return Rejected('No documents found')
        }

        const parsedDocs = docs.map(doc => monitoredProcessSchema.parse(doc))

        return Resolved(parsedDocs.map(doc => ({
          id: prop('_id', doc),
          authorized: prop('authorized', doc),
          lastFromSortKey: prop('lastFromSortKey', doc),
          type: prop('type', doc),
          interval: prop('interval', doc),
          block: prop('block', doc),
          createdAt: prop('createdAt', doc)
        })))
      })
      .toPromise()
  }
}


export default {
  cachedTxSchema,
  cachedMsgSchema,
  saveTxWith,
  findLatestTxWith,
  saveMsgWith,
  saveSpawnWith,
  updateMsgWith,
  findLatestMsgsWith,
  findLatestSpawnsWith,
  findLatestMonitorsWith,
  saveMonitoredProcessWith
}
