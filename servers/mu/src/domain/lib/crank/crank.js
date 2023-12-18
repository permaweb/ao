import { of, fromPromise } from 'hyper-async'
import { isNil, isEmpty, anyPass } from 'ramda'

import { tracerFor } from '../tracer.js'

const isNilOrEmpty = anyPass([isNil, isEmpty])

async function eventQueue (init) {
  const iters = [init]
  for (const iter of iters) {
    await iter().then((events) => iters.push(...events))
  }
}

function crankListWith ({ processMsg, processSpawn, saveMessageTrace }) {
  async function processOutboxFor ({ message, tracer, msgs = [], spawns = [] }) {
    /**
     * Nothing was produced in the outbox, so simply return no events
     */
    if (isNilOrEmpty(msgs) && isNilOrEmpty(spawns)) return []

    const events = []

    /**
     * Immediately push thunks to spawn processes from this outbox
     */
    events.push(...spawns.map((cachedSpawn) =>
      async () => of({ cachedSpawn, tracer })
        .chain(processSpawn)
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
     */
    events.push(...msgs.map((cachedMsg) =>
      async () => {
        const { tx, msgs, spawns } = await of({ cachedMsg, tracer })
          .chain(processMsg)
          .toPromise()

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
        const from = cachedMsg.msg.target

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
          spawns
        })
      }
    ))

    /**
     * The last event pushed onto the queue is to persist
     * the message trace record
     */
    events.push(async () => {
      return of()
        .map(() => tracer.unwrap())
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
  return ({ message, tracer, msgs, spawns }) => eventQueue(() => processOutboxFor({ message, tracer, msgs, spawns }))
}

export function crankWith ({ processMsg, processSpawn, saveMessageTrace, logger }) {
  const crankList = crankListWith({ processMsg, processSpawn, saveMessageTrace, logger })

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(crankList))
      .map(logger.tap('Cranked msgs'))
  }
}
