import { of, fromPromise, Resolved } from 'hyper-async'
import { isNil, isEmpty, anyPass } from 'ramda'

import { tracerFor } from '../tracer.js'
import { errFrom } from '../../utils.js'

const isNilOrEmpty = anyPass([isNil, isEmpty])

async function eventQueue (init) {
  const iters = [init]
  for (const iter of iters) {
    await iter().then((events) => iters.push(...events))
  }
}

function crankListWith ({ processMsg, processSpawn, saveMessageTrace, logger }) {
  async function processOutboxFor ({ message, tracer, msgs = [], spawns = [], initialTxId = null }) {
    /**
     * Nothing was produced in the outbox, so simply return no events
     */
    if (isNilOrEmpty(msgs) && isNilOrEmpty(spawns)) return []

    const events = []

    /**
     * Immediately push thunks to spawn processes from this outbox
     *
     * TODO TRACER: catch err and add to trace via tracer.trace
     */
    events.push(...spawns.map((cachedSpawn) =>
      async () => of({ cachedSpawn, tracer, initialTxId })
        .map(logger.tap('Processing outbox spawn from result of message %s', message.id))
        .chain(processSpawn)
        .bichain(
          (error) => {
            const parsedError = errFrom(error)
            tracer.trace(`Error occured processing outbox spawn ${parsedError.message} ${parsedError.stack}`)
            return Resolved({ error })
          },
          (res) => Resolved(res)
        )
        /**
         * No more events to push onto the event queue
         */
        .map(() => [])
        .toPromise()
    ))

    /**
     * We cannot know how many downstream outbox messages a message will produce. If we simply recursed
     * immediately, with enough messages, it could overflow the callstack, due to V8s lack of tail-call
     * optimization.
     *
     * So instead of immediately recursing, we instead return a thunk that processes the outbox for the
     * message's evaluation.
     *
     * This will result in this invocation being immediately popped off the callstack, before another invocation
     * is pushed onto the stack. Hence, there are no nested calls, and the stack does not grow unboundly.
     *
     * TODO TRACER: catch err, add to trace via tracer.trace, and return empty array [] to short-circuit crank
     */
    events.push(...msgs.map((cachedMsg) =>
      async () => {
        const result = await of({ cachedMsg, tracer, initialTxId })
          .map(logger.tap('Processing outbox message from result of message %s', message.id))
          .chain(processMsg)
          .bichain(
            (error) => {
              const parsedError = errFrom(error)
              tracer.trace(`Error occured processing outbox ${parsedError.message} ${parsedError.stack}`)
              return Resolved({ error })
            },
            (res) => Resolved(res)
          )
          .toPromise()

        if (result.error) {
          return []
        }

        const { tx, msgs, spawns } = result

        /**
         * The id for cachedMsg is not determined until the MU parses it into a data item,
         * signs it, and forwards it to a SU, then reads it's eval result,
         * as part of processMsg.
         *
         * So make sure to include the id from that subsequent data item as part of the
         * original message, when appending the event to process its outbox
         */
        const next = { ...cachedMsg.msg, id: tx.id }
        /**
         * The parent of each of these outbox messages is the message
         * that produced this outbox currently being processed
         */
        const parent = message.id
        /**
         * The original 'from' will always be a wallet address (see sendMsg)
         *
         * but any outbox messages downstream will be as a result of a process evaluating
         * a message and producing an outbox. Ergo, the 'from' for subsequent messages to be cranked
         * will always be the target of the message evaluated
         */
        const from = cachedMsg.msg.Target

        logger('Processing and tracing result outbox for message %s whose parent is %s', next.id, parent)
        /**
         * Process the outbox of each subsequent message
         * This will return the next set of events, that will be appended to the top level event queue
         */
        return processOutboxFor({
          message: next,
          /**
           * Create a new tracer for this message, that all of it's children will use.
           *
           * As the event queue is processed, this will create an ancestory tree, starting
           * from the original message
           */
          tracer: tracerFor({
            message: next,
            parent,
            from
          }),
          msgs,
          spawns,
          initialTxId
        })
      }
    ))

    /**
     * The last event pushed onto the queue is to persist
     * the message trace record
     *
     * TODO TRACER: uncomment and persist this trace record
     */
    events.push(async () => {
      return of()
        .map(() => tracer.unwrap())
        .map(logger.tap('Persisting trace for message %s', message.id))
        .chain(fromPromise(saveMessageTrace))
        /**
         * No more events to push onto the event queue
         */
        .map(() => [])
        .toPromise()
    })

    return events
  }

  /**
   * Begin the event queue with the initial outbox processing
   */
  return ({ message, tracer, msgs, spawns, initialTxId }) => eventQueue(() => processOutboxFor({ message, tracer, msgs, spawns, initialTxId }))
}

export function crankWith ({ processMsg, processSpawn, saveMessageTrace, logger }) {
  const crankList = crankListWith({ processMsg, processSpawn, saveMessageTrace, logger })

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(crankList))
      .map(logger.tap('Cranked msgs'))
  }
}
