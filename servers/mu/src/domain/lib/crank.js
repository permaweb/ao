import { of, fromPromise, Resolved } from 'hyper-async'
import { isNil, isEmpty, anyPass } from 'ramda'
import pMap from 'p-map'

import { errFrom } from '../utils.js'

const isNilOrEmpty = anyPass([isNil, isEmpty])

async function processEvents (init) {
  const events = await init()
  return pMap(
    events,
    async (event) => {
      const nextEvents = await event()
      if (!isNilOrEmpty(nextEvents)) {
        return processEvents(() => nextEvents)
      }
    }
  )
}

function crankListWith ({ processMsg, processSpawn, processAssign, logger }) {
  async function processOutbox ({ msgs = [], spawns = [], assigns = [], initialTxId = null }) {
    /**
     * Nothing was produced in the outbox, so simply return no events
     */
    if (isNilOrEmpty(msgs) && isNilOrEmpty(spawns) && isNilOrEmpty(assigns)) return []

    const events = []

    /**
     * Immediately push thunks to spawn processes from this outbox
     */
    events.push(...spawns.map((cachedSpawn) =>
      async () => of({ cachedSpawn, initialTxId })
        .chain(processSpawn)
        .bichain(
          (error) => {
            const parsedError = errFrom(error)
            logger(`Error occured processing outbox spawn ${parsedError.message} ${parsedError.stack}`)
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
     */
    events.push(...msgs.map((cachedMsg) =>
      async () => {
        const result = await of({ cachedMsg, initialTxId })
          .chain(processMsg)
          .bichain(
            (error) => {
              const parsedError = errFrom(error)
              logger(`Error occured processing outbox message ${parsedError.message} ${parsedError.stack}`)
              return Resolved({ error })
            },
            (res) => Resolved(res)
          )
          .toPromise()

        if (result.error) {
          return []
        }

        const { msgs, spawns, assigns } = result

        /**
         * Process the outbox of each subsequent message
         * This will return the next set of events, that will be appended to the top level event queue
         */
        return processOutbox({
          msgs,
          spawns,
          assigns,
          initialTxId
        })
      }
    ))

    /**
     * flatMap to flatten out the nested arrays
     */
    events.push(...assigns.flatMap((cachedAssign) =>
      /**
       * For each process listed we will need to push an event
       */
      cachedAssign.Processes.map((processId) => async () => {
        const result = await of({
          assign: {
            txId: cachedAssign.Message,
            processId,
            baseLayer: cachedAssign.BaseLayer === true ? '' : null,
            exclude: cachedAssign.Exclude && cachedAssign.Exclude.length > 0 ? cachedAssign.Exclude.join(',') : null
          },
          initialTxId
        })
          .chain(processAssign)
          .bichain(
            (error) => {
              const parsedError = errFrom(error)
              logger(`Error occured processing outbox assignment ${parsedError.message} ${parsedError.stack}`)
              return Resolved({ error })
            },
            (res) => Resolved(res)
          )
          .toPromise()

        if (result.error) {
          return []
        }

        const { msgs, spawns, assigns } = result

        /**
         * Process the outbox of each subsequent message
         * This will return the next set of events, that will be appended to the top level event queue
         */
        return processOutbox({
          msgs,
          spawns,
          assigns,
          initialTxId
        })
      })

    ))

    return events
  }

  /**
   * Begin the event queue with the initial outbox processing
   */
  return ({ msgs, spawns, assigns, initialTxId }) => processEvents(() => processOutbox({ msgs, spawns, assigns, initialTxId }))
}

export function crankWith ({ processMsg, processSpawn, processAssign, logger }) {
  const crankList = crankListWith({ processMsg, processSpawn, processAssign, logger })

  return (ctx) => {
    return of(ctx)
      .chain(fromPromise(crankList))
      .map(logger.tap('Cranked msgs'))
  }
}
