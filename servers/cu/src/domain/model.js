import { z } from 'zod'

export const domainConfigSchema = z.object({
  SEQUENCER_URL: z.string().url('SEQUENCER_URL must be a a valid URL'),
  GATEWAY_URL: z.string().url('GATEWAY_URL must be a a valid URL'),
  DB_PATH: z.string().min(1, 'DB_PATH set to the location of the database on disk must be provided'),
  DB_MAX_LISTENERS: z.number().int('DB_MAX_LISTENERS must be an integer')
})

export const streamSchema = z.any().refine(stream => {
  return stream !== null &&
    typeof stream === 'object' &&
    typeof stream.pipe === 'function'
}, { message: 'Value must implement the iteration protocol' })

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
    data: z.string().optional(),
    owner: z.string().min(1),
    target: z.string().min(1),
    anchor: z.string().optional(),
    from: z.string().min(1),
    'Forwarded-By': z.string().optional(),
    'Forwarded-For': z.string().optional(),
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
   * ao processes return { state, messages, spawns, output, error } }
   *
   * This is the output of process, after the action was applied
   */
  output: z.object({
    buffer: z.any().optional(),
    messages: z.array(z.any()).optional(),
    spawns: z.array(z.any()).optional(),
    output: z.any().optional(),
    error: z.any().optional()
  })
})
