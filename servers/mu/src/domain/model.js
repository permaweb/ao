import { z } from 'zod'

/**
 * TODO: move other models used by business logic into this API
 *
 * These are NOT persistence models, although may often times be mapped
 * to a persistence model ie. a document in a document db, or row in a SQL db
 */

export const messageTraceSchema = z.object({
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
  children: z.array(z.string().min(1)).optional(),
  /**
   * Any messages produced as a result of this messages evaluation.
   * In other words, these are the messages placed in the process outbox,
   * to be cranked by a MU.
   *
   * children can be used to build the entire trace down the original final cranked message.
   *
   * If null, then this message's evaluation produced no outbox messages.
   */
  spawns: z.array(z.string().min(1)).optional(),
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
