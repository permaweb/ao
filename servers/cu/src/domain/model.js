import { z } from 'zod'

export const positiveIntSchema = z.preprocess((val) => {
  if (!val) return -1
  if (typeof val === 'number') return val
  return typeof val === 'string' ? parseInt(val.replaceAll('_', '')) : -1
}, z.number().positive())

export const domainConfigSchema = z.object({
  /**
   * The maximum size, in bytes, that an ao processes' evaluated heap size
   * can reach before the CU will stop evaluating.
   *
   * ie. '1000' or '1_000'
   */
  PROCESS_WASM_HEAP_MAX_SIZE: positiveIntSchema,
  /**
   * The gateway for the CU to use fetch block metadata, data on arweave,
   * and Scheduler-Location data
   */
  GATEWAY_URL: z.string().url('GATEWAY_URL must be a a valid URL'),
  /**
   * The url of the uploader to use to upload Process Checkpoints to Arweave
   */
  UPLOADER_URL: z.string().url('UPLOADER_URL must be a a valid URL'),
  /**
   * Whether the database being used by the CU is embedded within the CU (ie. PouchDB)
   * or is on another remote process (ie. CouchDB)
   */
  DB_MODE: z.enum(['remote', 'embedded']),
  /**
   * The connection string to the database
   */
  DB_URL: z.string().min(1, 'DB_URL must be set to the database connection string'),
  /**
   * The maximum number of event listeners for the database
   */
  DB_MAX_LISTENERS: z.number().int('DB_MAX_LISTENERS must be an integer'),
  /**
   * The wallet for the CU
   */
  WALLET: z.string().min(1, 'WALLET must be a Wallet JWK Inteface'),
  /**
   * The interval, in milliseconds, at which to log memory usage on this CU.
   */
  MEM_MONITOR_INTERVAL: positiveIntSchema,
  /**
   * The number of evaluations the CU should perform before placing the next evaluation at the end
   * of the event queue.
   *
   * This helps hedge against CPU/Main thread starvation due to lengthy evaluations
   */
  EVAL_DEFER_BACKPRESSURE: positiveIntSchema,
  /**
   * The amount of time, in milliseconds, that the CU should wait before creating a process Checkpoint,
   * if it has already created a Checkpoint for that process.
   *
   * This is effectively a throttle on Checkpoint creation, for a given process
   */
  PROCESS_CHECKPOINT_CREATION_THROTTLE: positiveIntSchema,
  /**
   * Whether to disable Process Checkpoint creation entirely. Great for when developing locally,
   * of for an ephemeral CU
   */
  DISABLE_PROCESS_CHECKPOINT_CREATION: z.preprocess((val) => !!val, z.boolean()),
  /**
   * The maximum size of the in-memory cache used for Wasm binaries
   */
  WASM_MODULE_CACHE_MAX_SIZE: positiveIntSchema,
  /**
   * The maximum size, in bytes, of the cache used to cache the latest memory
   * evaluated for an ao process
   */
  PROCESS_MEMORY_CACHE_MAX_SIZE: positiveIntSchema,
  /**
   * The time to live for a cache entry in the process latest memory cache.
   * An entries ttl is rest each time it is accessed
   */
  PROCESS_MEMORY_CACHE_TTL: positiveIntSchema
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

export const blockSchema = z.object({
  height: z.coerce.number(),
  timestamp: z.coerce.number()
})

export const processSchema = z.object({
  id: z.string().min(1),
  /**
   * nullish for backwards compatibility
   */
  signature: z.string().nullish(),
  data: z.any().nullish(),
  anchor: z.string().nullish(),
  owner: z.string().min(1),
  tags: z.array(rawTagSchema),
  block: blockSchema
})

export const moduleSchema = z.object({
  id: z.string().min(1),
  tags: z.array(rawTagSchema)
})

export const messageSchema = z.object({
  /**
   * Whether or not this message's evaluation should be saved.
   *
   * This is currently used ONLY for the initial message on a process
   * cold start
   */
  noSave: z.boolean().default(false),
  /**
   * The deep hash for the message. Only calculated by the CU
   * for messages with a Forwarded-For tag.
   *
   * This is value is ultimately persisted, so that it can be queried
   * to detect duplicate messages and remove them from the eval stream
   */
  deepHash: z.string().nullish(),
  /**
   * If the message was generated as the result of a Cron-Interval,
   * The unique identifier of the cron that produced this message
   */
  cron: z.string().nullish(),
  /**
   * Used as part of guaranteeing ordering for evaluations in the CU.
   *
   * For scheduled messages, this is simply set to the nonce.
   * For cron messages, this is set to the most recent scheduled messages nonce,
   * or a small unicode code.
   *
   * The important bit is that this value is lexicographically sortable
   *
   * This way, all messages, scheduled and cron, remain orderable.
   */
  ordinate: z.coerce.string(),
  /**
   * A canonical name that can used for logging purposes
   */
  name: z.string(),
  message: z.object({
    /**
     * The tx id of the message ie. the data item id
     *
     * cron messages do not have an id, so this is optional
     */
    Id: z.string().nullish(),
    /**
     * cron messages are generated by a CU, and not signed, and so not have a signature,
     * so this is optional
     */
    Signature: z.string().nullish(),
    Data: z.any().nullish(),
    Owner: z.string().min(1),
    Target: z.string().min(1),
    Anchor: z.string().nullish(),
    From: z.string().min(1),
    'Forwarded-By': z.string().nullish(),
    Tags: z.array(rawTagSchema),
    /**
     * cron messages do not have a nonce or epoch
     * since they are generated "between" nonces received
     * from a SU
     */
    Epoch: z.number().nullish(),
    Nonce: z.number().nullish(),
    Timestamp: z.coerce.number(),
    'Block-Height': z.coerce.number(),
    /**
     * cron messages are not included in the hash chain, and so do not have one,
     * so this is optional
     */
    'Hash-Chain': z.string().nullish(),
    /**
     * Whether the message is a cron generated message or not
     */
    Cron: z.boolean(),
    'Read-Only': z.boolean().default(false)
  }),
  AoGlobal: z.object({
    Process: z.object({
      Id: z.string(),
      Owner: z.string(),
      Tags: z.array(rawTagSchema)
    })
  }).passthrough() // TODO: remove once AoGlobal is more defined
}).passthrough()

export const scheduleSchema = z.object({
  name: z.string(),
  cron: z.string().nullish(),
  blocks: z.number().nullish(),
  message: z.any()
})

export const evaluationSchema = z.object({
  /**
   * the id of the process that the message was performed upon
   */
  processId: z.string().min(1),
  /**
   * Cron messages do not have a messageId
   * and so can be undefined
   */
  messageId: z.string().min(1).nullish(),
  timestamp: z.coerce.number(),
  /**
   * Cron messages do not have an epoch
   */
  epoch: z.coerce.number().nullish(),
  /**
   * Cron messages do not have a nonce
   */
  nonce: z.coerce.number().nullish(),
  /**
   * Used for ordering the evaluation stream and results in the CU
   *
   * For a Scheduled Message, this will always simply be it's nonce.
   * For a Cron Message, this will be the nonce of the most recent Scheduled Message.
   */
  ordinate: z.coerce.string(),
  blockHeight: z.coerce.number(),
  /**
   * Scheduled messages do not have a cron,
   * and so can be undefined
   */
  cron: z.string().nullish(),
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
   * ao processes return { Memory, Message, Spawns, Output, Error } }
   *
   * This is the output of process, after the action was applied
   */
  output: z.object({
    Memory: z.any().nullish(),
    Messages: z.array(z.any()).nullish(),
    Spawns: z.array(z.any()).nullish(),
    Output: z.any().nullish(),
    GasUsed: z.number().nullish(),
    Error: z.any().nullish()
  })
})
