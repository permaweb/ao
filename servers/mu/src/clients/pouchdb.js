import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, head, prop } from 'ramda'
import z from 'zod'
import PouchDb from 'pouchdb'
import PouchDbFind from 'pouchdb-find'
import NodeLevelDB from 'pouchdb-adapter-leveldb'

PouchDb.plugin(NodeLevelDB)
PouchDb.plugin(PouchDbFind)
const internalPouchDb = new PouchDb('ao-cache', { adapter: 'leveldb' })

const cachedTxSchema = z.object({
  _id: z.string().min(1),
  data: z.string().min(1),
  contractId: z.string().min(1),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveTxWith ({ pouchDb, logger: _logger }) {
  const logger = _logger.child('saveInitialTx')
  return (tx) => {
    return of(tx)
      .map(applySpec({
        _id: prop('txId'),
        data: prop('data'),
        contractId: prop('contractId'),
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
        contractId: prop('contractId'),
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
        cachedAt: prop('cachedAt')
      }))
      .map(cachedMsgSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.put(doc)))
          .bimap(
            logger.tap('Encountered an error when caching msg'),
            logger.tap('Cached tx')
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

function findLatestMsgsWith (
  { pouchDb }
) {
  return ({ fromTxId }) => {
    return of({ fromTxId })
      .chain(fromPromise(() => {
        return pouchDb.find({
          selector: {
            fromTxId: {
              $eq: fromTxId
            }
          },
          sort: [{ _id: 'desc' }]
        }).then((res) => {
          if (res.warning) console.warn(res.warning)
          return res.docs
        })
      }))
      .chain((docs) => docs.length > 0 ? Resolved(docs) : Rejected(docs))
      .map(docs => docs.map(doc => cachedMsgSchema.parse(doc)))
      .map(docs => docs.map(doc => ({
        id: prop('_id', doc),
        fromTxId: prop('fromTxId', doc),
        toTxId: prop('toTxId', doc),
        msg: prop('msg', doc),
        cachedAt: prop('cachedAt', doc)
      })))
      .bichain(Resolved, Resolved)
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
  updateMsgWith,
  findLatestMsgsWith
}
