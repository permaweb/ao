import { of } from 'hyper-async'

import { crankWith } from '../lib/crank.js'

/**
 * Accepts the result of an evaluation, and processes the outbox,
 * ie. the messages and spawns
 */
export function crankMsgsWith ({
  processMsg,
  processSpawn,
  processAssign,
  logger
}) {
  const crank = crankWith({ processMsg, processSpawn, processAssign, logger })

  return (ctx) => {
    return of(ctx)
      .chain(crank)
  }
}
