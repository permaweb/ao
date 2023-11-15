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
      { name: 'ao-type', value: 'message' },
      { name: 'SDK', value: 'ao' },
      { name: 'ao-spawn-success', value: ctx.processTx.id }
    ]
    const forwardedFor = ctx.cachedSpawn.spawn.tags.find((tag) => 
      tag.name === 'Forwarded-For'
    )
    return of(ctx)
      .chain(fromPromise(() => buildAndSign({
        processId: forwardedFor.value,
        tags: tags
      })))
      .map(assoc('spawnSuccessTx', __, ctx))
      .map(ctxSchema.parse)
      .map(logger.tap('Added spawnSuccessTx to ctx'))
  }
}
