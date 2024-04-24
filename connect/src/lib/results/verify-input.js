import { of } from 'hyper-async'
import { z } from 'zod'

const inputSchema = z.object({
  process: z.string().min(1, { message: 'process identifier is required' }),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(['ASC', 'DESC']).default('ASC'),
  limit: z.number().optional()
})

/**
 * @callback VerifyInput
 *
 * @returns {VerifyInput}
 */
export function verifyInputWith () {
  return (ctx) => {
    return of(ctx)
      .map(inputSchema.parse)
      .map(() => ctx)
  }
}
