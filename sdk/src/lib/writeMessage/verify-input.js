import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.any(
  // TODO: anything we need to verify?
)

/**
 * @typedef Context2
 * @property {{ name: string, value: string }[]} tags
 *
 * @callback VerifyInput
 * @param {Context2} ctx
 *
 * @returns {VerifyInput}
 */
export function verifyInputWith () {
  return (ctx) => {
    return of(ctx.tags)
      .map(inputSchema.parse)
      .map(() => ctx)
  }
}
