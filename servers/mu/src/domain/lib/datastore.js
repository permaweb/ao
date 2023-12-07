import { fromPromise, of, Rejected, Resolved } from 'hyper-async'
import { always, applySpec, prop } from 'ramda'
import { z } from 'zod'

const cachedMsgSchema = z.object({
  _id: z.string().min(1),
  fromTxId: z.string().min(1),
  toTxId: z.string().min(1).nullable().optional(),
  msg: z.any(),
  _rev: z.string().optional(),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  ),
  processId: z.string().min(1)
})

function saveMsgWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('saveMsg')
  return (msg) => {
    return of(msg)
      .map(applySpec({
        _id: prop('id'),
        fromTxId: prop('fromTxId'),
        msg: prop('msg'),
        cachedAt: prop('cachedAt'),
        processId: prop('processId')
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

function findLatestMsgsWith ({ dbInstance }) {
  return ({ fromTxId }) => {
    return of({ fromTxId })
      .chain(fromPromise(() => {
        return dbInstance.findMsgs(fromTxId).then((res) => {
          return res
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
          cachedAt: prop('cachedAt', doc),
          processId: prop('processId', doc)
        })))
      })
      .toPromise()
  }
}

function deleteMsgWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('deleteMsg')

  return (_id) => {
    return of({ _id })
      .chain(fromPromise(() => dbInstance.deleteMsg(_id)))
      .bimap(
        logger.tap('Encountered an error when deleting msg'),
        logger.tap('Deleted msg')
      )
      .bichain(Resolved, Resolved)
      .map(always(_id))
      .toPromise()
  }
}

const cachedSpawnSchema = z.object({
  _id: z.string().min(1),
  fromTxId: z.string().min(1),
  toTxId: z.string().min(1).nullable().optional(),
  spawn: z.any(),
  _rev: z.string().optional(),
  cachedAt: z.preprocess(
    (arg) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  ),
  processId: z.string().min(1)
})

function saveSpawnWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('spawn')
  return (spawn) => {
    return of(spawn)
      .map(applySpec({
        _id: prop('id'),
        fromTxId: prop('fromTxId'),
        spawn: prop('spawn'),
        cachedAt: prop('cachedAt'),
        processId: prop('processId')
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
          return res
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
          cachedAt: prop('cachedAt', doc),
          processId: prop('processId', doc)
        })))
      })
      .toPromise()
  }
}

function deleteSpawnWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('deleteSpawn')

  return (_id) => {
    return of(_id)
      .chain(fromPromise(() => dbInstance.deleteSpawn(_id)))
      .bimap(
        logger.tap('Encountered an error when deleting spawn'),
        logger.tap('Deleted spawn')
      )
      .bichain(Resolved, Resolved)
      .map(always(_id))
      .toPromise()
  }
}

const monitoredProcessSchema = z.object({
  _id: z.string().min(1),
  // is this monitored process authorized to run by the server (is it funded)
  authorized: z.boolean(),
  lastFromSortKey: z.string().optional().nullable(),
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
          return res
        })
      }))
      .chain((docs) => {
        if (docs.length === 0) {
          return Resolved([])
        }

        const parsedDocs = docs.map(doc => monitoredProcessSchema.parse(doc))

        return Resolved(parsedDocs.map(doc => ({
          id: prop('_id', doc),
          authorized: prop('authorized', doc),
          lastFromSortKey: prop('lastFromSortKey', doc),
          interval: prop('interval', doc),
          block: prop('block', doc),
          createdAt: prop('createdAt', doc)
        })))
      })
      .toPromise()
  }
}

function updateMonitorWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('updateMonitor')

  return ({ id, lastFromSortKey }) => {
    return of({ id })
      .chain(fromPromise(() => dbInstance.getMonitor(id)))
      .map(doc => ({ ...doc, lastFromSortKey }))
      .map(monitoredProcessSchema.parse)
      .chain(updatedDoc =>
        of(updatedDoc)
          .chain(fromPromise(() => dbInstance.putMonitor(updatedDoc)))
          .bimap(
            logger.tap('Encountered an error when updating monitor'),
            logger.tap('Updated monitor')
          )
          .bichain(Resolved, Resolved)
          .map(always(updatedDoc._id))
      )
      .toPromise()
  }
}

const messageTraceSchema = z.object({
  /**
   * The transactionId of the message
   */
  _id: z.string().min(1),
  /**
   * The id of the message that produced this message.
   * In other words, this message was retrieved from an outbox and cranked
   * by a MU.
   *
   * parent can be used to build the entire trace up to the original un-cranked message.
   *
   * If null, then this message was sent directly to a MU ie. it wasn't cranked.
   */
  parent: z.string().optional(),
  /**
   * Any messages produced as a result of this messages evaluation.
   * In other words, these are the messages placed in the process outbox,
   * to be cranked by a MU.
   *
   * children can be used to build the entire trace down the original final cranked message.
   *
   * If null, then this message's evaluation produced no outbox messages.
   */
  children: z.array(z.string.min(1)).optional(),
  /**
   * Any messages produced as a result of this messages evaluation.
   * In other words, these are the messages placed in the process outbox,
   * to be cranked by a MU.
   *
   * children can be used to build the entire trace down the original final cranked message.
   *
   * If null, then this message's evaluation produced no outbox messages.
   */
  spawns: z.array(z.string.min(1)).optional(),
  /**
   * The process that sent this message
   *
   * Could also be a wallet address, if the message was signed directly by a wallet,
   * in other words, not cranked
   */
  from: z.string().min(1),
  /**
   * The process this message was for aka. the message's target
   */
  to: z.string().min(1),
  /**
   * The JSON representation of the message aka. the DataItem parsed as JSON
   */
  message: z.record(z.any()),
  /**
   * An array of logs related to the processing of this message.
   * This is meant to give more resolution to the steps taken to process a message
   */
  trace: z.array(z.string()),
  /**
   * The time at which this message trace was started.
   *
   * This is useful when ordering all of the message traces for a process
   */
  tracedAt: z.preprocess(
    (
      arg
    ) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  )
})

function saveMessageTraceWith ({ dbInstance, logger: _logger }) {
  const logger = _logger.child('saveMessageTrace')

  return (messageTrace) => {
    return of(messageTrace)
      .map(applySpec({
        _id: prop('id'),
        parent: prop('parent'),
        children: prop('children'),
        spawns: prop('spawns'),
        from: prop('from'),
        to: prop('to'),
        message: prop('message'),
        trace: prop('trace'),
        tracedAt: prop('tracedAt')
      }))
      .map(messageTraceSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => dbInstance.putMessageTrace(doc)))
          .bimap(
            logger.tap(`Encountered an error when saving message trace for message ${messageTrace.id}`),
            logger.tap('Saved message trace')
          )
          .bichain(Resolved, Resolved)
          .map(always(doc._id))
      )
      .toPromise()
  }
}

function findMessageTracesWith ({ dbInstance, logger: _logger }) {
  const criteria = z.object({
    id: z.string().optional(),
    from: z.string().optional(),
    to: z.string().optional(),
    /**
     * Always require a limit, so the database does not get bogged down
     * with sending too large of a response
     */
    limit: z.number().int().positive(),
    offset: z.number().int().positive().optional()
  })

  return ({ id, from, to, limit, offset }) => {
    return of({ id, from, to, limit, offset })
      .map(params => criteria.parse(params))
      .chain(fromPromise((params) => dbInstance.findMessageTraces(params)))
      .chain((docs) => {
        return Resolved(
          docs.map((doc) => messageTraceSchema.parse(
            applySpec({
              _id: prop('_id'),
              parent: prop('parent'),
              children: prop('children'),
              spawns: prop('spawns'),
              from: prop('from'),
              to: prop('to'),
              message: prop('message'),
              trace: prop('trace'),
              tracedAt: prop('tracedAt')
            }, doc)
          ))
        )
      })
      .toPromise()
  }
}

export default {
  cachedMsgSchema,
  saveMsgWith,
  saveSpawnWith,
  updateMonitorWith,
  findLatestMsgsWith,
  findLatestSpawnsWith,
  findLatestMonitorsWith,
  saveMonitoredProcessWith,
  deleteMsgWith,
  deleteSpawnWith,
  messageTraceSchema,
  saveMessageTraceWith,
  findMessageTracesWith
}
