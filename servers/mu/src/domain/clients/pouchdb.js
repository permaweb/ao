import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, prop } from 'ramda'
import z from 'zod'
import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import NodeLevelDB from 'pouchdb-adapter-leveldb'

PouchDb.plugin(NodeLevelDB)
PouchDb.plugin(PouchDbFind)
const internalPouchDb = (dbFile) => new PouchDb(dbFile, { adapter: 'leveldb' })

const cachedTxSchema = z.object({
  _id: z.string().min(1),
  data: z.any(),
  processId: z.string().min(1),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveTxWith ({ pouchDb, logger: _logger }) {
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
          .chain(fromPromise((doc) => pouchDb.get(doc._id)))
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
              : of(doc).chain(fromPromise((doc) => pouchDb.put(doc)))
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
  { pouchDb }
) {
  return ({ id }) => {
    return of({ txId: id })
      .chain(fromPromise(() => {
        return pouchDb.find({
          selector: {
            _id: {
              $eq: id
            }
          },
          sort: [{ _id: 'desc' }],
          limit: 1
        }).then((res) => {
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

function saveMsgWith ({ pouchDb, logger: _logger }) {
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
          .chain(fromPromise((doc) => pouchDb.put(doc)))
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

function updateMsgWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('updateMsg')

  return ({ _id, toTxId }) => {
    return of({ _id })
      .chain(fromPromise(() => pouchDb.get(_id)))
      .map(doc => ({ ...doc, toTxId }))
      .map(cachedMsgSchema.parse)
      .chain(updatedDoc =>
        of(updatedDoc)
          .chain(fromPromise(() => pouchDb.put(updatedDoc)))
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

function findLatestMsgsWith ({ pouchDb }) {
  return ({ fromTxId }) => {
    return of({ fromTxId })
      .chain(fromPromise(() => {
        return pouchDb.find({
          selector: {
            fromTxId: {
              $eq: fromTxId
            },
            type: 'message'
          },
          sort: [{ _id: 'desc' }]
        }).then((res) => {
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

function saveSpawnWith ({ pouchDb, logger: _logger }) {
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
          .chain(fromPromise((doc) => pouchDb.put(doc)))
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

function findLatestSpawnsWith ({ pouchDb }) {
  return ({ fromTxId }) => {
    return of({ fromTxId })
      .chain(fromPromise(() => {
        return pouchDb.find({
          selector: {
            fromTxId: {
              $eq: fromTxId
            },
            type: 'spawn'
          },
          sort: [{ _id: 'desc' }]
        }).then((res) => {
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
  _rev: z.string().optional(),
  createdAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveMonitoredProcessWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('saveMonitoredProcess')
  return (process) => {
    return of(process)
      .map(applySpec({
        _id: prop('id'),
        authorized: prop('authorized'),
        lastFromSortKey: prop('lastFromSortKey'),
        type: always('monitor'),
        createdAt: prop('createdAt')
      }))
      .map(monitoredProcessSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bimap(
            logger.tap('Encountered an error when caching monitored process'),
            logger.tap('Cached spawn')
          )
          .bichain(Resolved, Resolved)
          .map(always(doc._id))
      )
      .toPromise()
  }
}

function findLatestMonitorsWith ({ pouchDb }) {
  return () => {
    return of({})
      .chain(fromPromise(() => {
        return pouchDb.find({
          selector: {
            type: 'monitor'
          }
        }).then((res) => {
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
          createdAt: prop('createdAt', doc)
        })))
      })
      .toPromise()
  }
}


export default {
  pouchDb: internalPouchDb,
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
