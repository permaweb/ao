import { z } from 'zod'

export const interactionSchema = z.object({
  action: z.object({
    input: z.object({
      function: z.string()
    }).passthrough()
  }).passthrough(),
  sortKey: z.string(),
  SWGlobal: z.object({
    contract: z.object({
      id: z.string(),
      owner: z.string()
    }),
    transaction: z.object({
      id: z.string(),
      owner: z.string(),
      target: z.string(),
      quantity: z.number(),
      reward: z.number(),
      tags: z.array(z.object({
        name: z.string(),
        value: z.string()
      }))
    }),
    block: z.object({
      height: z.number(),
      indep_hash: z.string(),
      timestamp: z.number()
    })
  })
})

export const evaluationSchema = z.object({
  /**
   * The sort key of the interaction
   */
  sortKey: z.string().min(1),
  /**
   * the id of the contract that the interaction was performed upon
   */
  parent: z.string().min(1),
  /**
   * The date when this record was created, effectively
   * when this record was cached
   *
   * not to be confused with when the transaction was placed on chain
   */
  cachedAt: z.preprocess(
    (
      arg
    ) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  ),
  /**
   * The action performed by the interaction
   */
  action: z.record(z.any()),
  /**
   * The output received after applying the interaction
   * to the previous state.
   *
   * See https://github.com/ArweaveTeam/SmartWeave/blob/master/CONTRACT-GUIDE.md#contract-format-and-interface
   * for shape
   */
  output: z.object({
    state: z.record(z.any()).optional()
    /**
     * TODO: do we need to cache result as well?
     * For now, caching state
     */
  })
})
