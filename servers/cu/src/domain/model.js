import { z } from 'zod'

export const domainConfigSchema = z.object({
  SEQUENCER_URL: z.string().url('SEQUENCER_URL must be a a valid URL'),
  GATEWAY_URL: z.string().url('GATEWAY_URL must be a a valid URL')
})

export const rawTagSchema = z.object({
  name: z.string(),
  value: z.string()
})

export const rawBlockSchema = z.object({
  height: z.number(),
  timestamp: z.number()
})

export const processSchema = z.object({
  id: z.string().min(1),
  owner: z.string().min(1),
  tags: z.array(rawTagSchema),
  /**
   * The block that the process is in.
   *
   * Needed in order to calculate implicit messages
   */
  block: rawBlockSchema
})

export const messageSchema = z.object({
  sortKey: z.string().min(1),
  message: z.object({
    owner: z.string().min(1),
    target: z.string().optional(),
    anchor: z.string().optional(),
    from: z.string().optional(),
    'Forwarded-By': z.string().optional(),
    tags: z.array(rawTagSchema)
  }),
  AoGlobal: z.object({
    process: z.object({
      id: z.string(),
      owner: z.string()
    }),
    block: rawBlockSchema
    // TODO: more here
  }).passthrough() // TODO: remove once AoGlobal is more defined
}).passthrough()

export const scheduleSchema = z.object({
  name: z.string(),
  cron: z.string().optional(),
  blocks: z.number().optional(),
  message: z.any()
})

export const evaluationSchema = z.object({
  /**
   * The sort key of the message
   */
  sortKey: z.string().min(1),
  /**
   * the id of the process that the message was performed upon
   */
  processId: z.string().min(1),
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
   * The message applied to the process
   */
  message: z.record(z.any()),
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
