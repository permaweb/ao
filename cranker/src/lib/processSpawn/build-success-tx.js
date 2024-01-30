import { of, fromPromise } from 'hyper-async'
import z from 'zod'
import { assoc, __ } from 'ramda'

const ctxSchema = z.object({
  spawnSuccessTx: z.any()
}).passthrough()

export function buildSuccessTxWith ({ buildAndSign, logger }) {
  return (ctx) => {
    const tags = [
      { name: 'Data-Protocol', value: 'ao' },
      { name: 'Type', value: 'Message' },
      { name: 'AO-Spawn-Success', value: ctx.processTx }
    ]

    return of(ctx)
      .chain(fromPromise(() => buildAndSign({
        processId: ctx.resultSpawn.processId,
        tags
      })))
      .map(assoc('spawnSuccessTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added spawnSuccessTx to ctx'))
  }
}
