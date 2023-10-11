import { z } from 'zod'

export const domainConfigSchema = z.object({
  SEQUENCER_URL: z.string().url('SEQUENCER_URL must be a a valid URL'),
  GATEWAY_URL: z.string().url('GATEWAY_URL must be a a valid URL')
})

export const messageSchema = z.object({
  action: z.record(z.any()),
  sortKey: z.string(),
  AoGlobal: z.object({
    process: z.object({
      id: z.string(),
      owner: z.string()
    }),
    transaction: z.object({
      id: z.string(),
      owner: z.string(),
      target: z.string(),
      quantity: z.number(),
      reward: z.number()
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
   * when this record was evaluated
   *
   * not to be confused with when the transaction was placed on chain
   */
  evaluatedAt: z.preprocess(
    (
      arg
    ) => (typeof arg === 'string' || arg instanceof Date ? new Date(arg) : arg),
    z.date()
  ),
  /**
   * The action applied to the process
   */
  action: z.record(z.any()),
  /**
   * ao processes return { state, result: { messages, spawns, output, error } }
   *
   * This is the output of process, after the action was applied
   */
  output: z.object({
    state: z.record(z.any()).optional(),
    result: z.record(z.any()).optional()
  })
})
