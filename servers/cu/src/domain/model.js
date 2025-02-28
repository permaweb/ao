import { z } from 'zod'

import { logLevels } from './logger.js'

export const positiveIntSchema = z.preprocess((val) => {
  if (val == null) return -1
  if (typeof val === 'number') return val
  return typeof val === 'string' ? parseInt(val.replaceAll('_', '')) : -1
}, z.number().nonnegative())

export const commaDelimitedArraySchema = z.preprocess((val) => {
  if (Array.isArray(val)) return val
  // ',' delimited string
  if (typeof val === 'string') return val.split(',').map((s) => s.trim())
  return val
}, z.array(z.string()))

export const domainConfigSchema = z.object({
  DEFAULT_LOG_LEVEL: logLevels,
  LOG_CONFIG_PATH: z.string().default(''),
  /**
   * shim to support llama configurability.
   */
  MODULE_MODE: z.string().nullish(),
  /**
   * The maximum Memory-Limit, in bytes, supported for ao processes
   *
   * ie. '1000' or '1_000'
   */
  PROCESS_WASM_MEMORY_MAX_LIMIT: positiveIntSchema,
  /**
   * The maximum Compute-Limit, in bytes, supported for ao processes
   *
   * ie. '1000' or '1_000'
   */
  PROCESS_WASM_COMPUTE_MAX_LIMIT: positiveIntSchema,
  /**
   * The wasm module formats that this CU supports
   */
  PROCESS_WASM_SUPPORTED_FORMATS: commaDelimitedArraySchema,
  /**
   * The wasm extensions that this CU supports
   */
  PROCESS_WASM_SUPPORTED_EXTENSIONS: commaDelimitedArraySchema,
  /**
   * The url for the graphql server to be used by the CU
   * to query for metadata from an Arweave Gateway
   *
   * ie. https://arweave.net/graphql
   */
  GRAPHQL_URL: z.string().url('GRAPHQL_URL must be a valid URL'),
  /**
   * An array of urls for the graphql server to be used by the CU
   * to query for block metadata from an Arweave Gateway. On retries, the urls will be cycled through.
   *
   * ie. ['https://arweave.net/graphql', 'https://arweave-search.goldsky.com/graphql']
   */
  GRAPHQL_URLS: z.array(z.string().url('GraphQL_URLS must be a valid URL')),
  /**
   * The url for the graphql server to be used by the CU
   * to query for process Checkpoints.
   *
   * ie. https://arweave.net/graphql
   */
  CHECKPOINT_GRAPHQL_URL: z.string().url('CHECKPOINT_GRAPHQL_URL must be a valid URL'),
  /**
   * The url for the server that hosts the Arweave http API
   *
   * ie. https://arweave.net
   */
  ARWEAVE_URL: z.string().url('ARWEAVE_URL must be a valid URL'),
  /**
   * The url of the uploader to use to upload Process Checkpoints to Arweave
   *
   * ie. https://up.arweave.net
   */
  UPLOADER_URL: z.string().url('UPLOADER_URL must be a a valid URL'),
  /**
   * The connection string to the database
   */
  DB_URL: z.string().min(1, 'DB_URL must be set to the database connection string'),
  HB_URL: z.string().url().nullish(),
  /**
   * The wallet for the CU
   */
  WALLET: z.string().min(1, 'WALLET must be a Wallet JWK Inteface'),
  /**
   * The interval, in milliseconds, at which to log memory usage on this CU.
   */
  MEM_MONITOR_INTERVAL: positiveIntSchema,
  /**
   * The amount of time, in milliseconds, that the CU should wait before creating a process Checkpoint,
   * if it has already created a Checkpoint for that process.
   *
   * This is effectively a throttle on Checkpoint creation, for a given process
   */
  PROCESS_CHECKPOINT_CREATION_THROTTLE: positiveIntSchema,
  /**
   * Whether to disable Arweave Process Checkpoint creation. Great for when developing locally,
   * of for an ephemeral CU
   */
  DISABLE_PROCESS_CHECKPOINT_CREATION: z.preprocess((val) => !!val, z.boolean()),
  /**
   * Whether to disable File Process Checkpoint creation entirely.
   */
  DISABLE_PROCESS_FILE_CHECKPOINT_CREATION: z.preprocess((val) => !!val, z.boolean()),
  /**
   * Whether to disable caching process evaluations, useful when operating as
   * a RU
   */
  DISABLE_PROCESS_EVALUATION_CACHE: z.preprocess((val) => !!val, z.boolean()),
  /**
   * If a process uses this amount of
   * gas, then it will immediately create a Checkpoint at the end of the
   * evaluation stream.
   */
  EAGER_CHECKPOINT_ACCUMULATED_GAS_THRESHOLD: positiveIntSchema,
  /**
   * The number of workers to use for evaluating messages
   */
  WASM_EVALUATION_MAX_WORKERS: positiveIntSchema,
  /**
   * The max size of the dry run worker thread pool queue
   * of work. If the queue size hits this value,
   * then subsequent enqueues are rejected.
   */
  WASM_EVALUATION_WORKERS_DRY_RUN_MAX_QUEUE: positiveIntSchema,
  /**
   * The percentage of worker threads to allocate to primary tasks
   * such as evaluations from "/result" or "/cron"
   *
   * Evaluations for "non-primary" workloads ie. "/dry-run" will
   * be performed using 1 - WASM_EVALUATION_PRIMARY_WORKERS_PERCENTAGE
   * of the max worker threads
   */
  WASM_EVALUATION_PRIMARY_WORKERS_PERCENTAGE: positiveIntSchema,
  /**
   * The maximum size of the in-memory cache used for wasm instances
   */
  WASM_INSTANCE_CACHE_MAX_SIZE: positiveIntSchema,
  /**
   * The maximum size of the in-memory cache used for Wasm modules
   */
  WASM_MODULE_CACHE_MAX_SIZE: positiveIntSchema,
  /**
   * The directory to place wasm binaries downloaded from arweave.
   */
  WASM_BINARY_FILE_DIRECTORY: z.string().min(1),
  /**
   * An array of process ids that should not use Checkpoints
   * on Arweave.
   */
  PROCESS_IGNORE_ARWEAVE_CHECKPOINTS: commaDelimitedArraySchema,
  /**
   * An array of trusted owner wallets that Arweave checkpoints can be queried from.
   */
  PROCESS_CHECKPOINT_TRUSTED_OWNERS: commaDelimitedArraySchema,
  /**
   * An array of checkpoint ids that should not be used
   */
  IGNORE_ARWEAVE_CHECKPOINTS: commaDelimitedArraySchema,
  /**
   * The maximum size, in bytes, of the cache used to cache the latest memory
   * evaluated for an ao process
   */
  PROCESS_MEMORY_CACHE_MAX_SIZE: positiveIntSchema,
  /**
   * The time to live for a cache entry in the process latest memory cache.
   * An entries ttl is rest each time it is accessed
   */
  PROCESS_MEMORY_CACHE_TTL: positiveIntSchema,
  /**
   * The directory to store process memory that has been drained
   * from the LRU In-Memory cache (not to be conflated with file checkpoints -- see below)
   */
  PROCESS_MEMORY_CACHE_FILE_DIR: z.string().min(1),
  /**
   * The directory to store process memory associated with file checkpoints.
   * Process file checkpoints will persist across CU restarts
   */
  PROCESS_MEMORY_FILE_CHECKPOINTS_DIR: z.string().min(1),
  /**
   * The interval at which the CU should Checkpoint all processes stored in it's
   * cache.
   *
   * Set to 0 to disable
   */
  PROCESS_MEMORY_CACHE_CHECKPOINT_INTERVAL: positiveIntSchema,
  /**
   * The amount of time in milliseconds, the CU should wait for evaluation to complete
   * before responding with a "busy" message to the client
   */
  BUSY_THRESHOLD: positiveIntSchema,
  /**
   * A list of process ids that the CU should restrict
   * aka. blacklist
   */
  RESTRICT_PROCESSES: commaDelimitedArraySchema,
  /**
   * A list of process ids that the CU should exclusively allow
   * aka. whitelist
   */
  ALLOW_PROCESSES: commaDelimitedArraySchema,
  /**
   * A list of wallets whose processes the CU should exclusively allow
   * aka. whitelist of processes created by these wallets
   */
  ALLOW_OWNERS: commaDelimitedArraySchema
})

export const bufferSchema = z.any().refine(buffer => {
  return buffer instanceof ArrayBuffer ||
    ArrayBuffer.isView(buffer) ||
    Buffer.isBuffer(buffer)
}, { message: 'Value must implement the buffer protocol' })

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

export const ownerSchema = z.object({
  address: z.string(),
  key: z.string()
})

export const processSchema = z.object({
  id: z.string().min(1),
  /**
   * nullish for backwards compatibility
   */
  signature: z.string().nullish(),
  data: z.any().nullish(),
  anchor: z.string().nullish(),
  owner: ownerSchema.partial({ key: true }),
  tags: z.array(rawTagSchema),
  block: blockSchema
})

export const processCheckpointSchema = z.object({
  src: z.enum(['memory', 'file', 'record', 'arweave', 'cold_start']),
  fromFile: z.string().nullish(),
  Memory: bufferSchema.nullish(),
  moduleId: z.string().nullish(),
  assignmentId: z.string().nullish(),
  hashChain: z.string().nullish(),
  timestamp: z.coerce.number().nullish(),
  epoch: z.coerce.number().nullish(),
  nonce: z.coerce.number().nullish(),
  blockHeight: z.coerce.number().nullish(),
  cron: z.string().nullish(),
  ordinate: z.string()
})

export const moduleSchema = z.object({
  id: z.string().min(1),
  tags: z.array(rawTagSchema),
  owner: ownerSchema
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
  /**
   * Whether the message is a pure assignment of an on-chain message
   */
  isAssignment: z.boolean().default(false),
  /**
   * The id of the assignment.
   *
   * cron messages do not have an assignment, so this
   * is optional
   */
  assignmentId: z.string().nullish(),
  /**
   * For assignments, any exclusions to not be passed to the process,
   * and potentially not loaded from the gateway or arweave
   */
  exclude: z.array(z.string()).nullish(),
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
    /**
     * Target may be an empty string, in the case of assignment
     * of a tx with no recipient
     *
     * Ergo, there is no min length on target.
     */
    Target: z.string(),
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
    }),
    Module: z.object({
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
  /**
   * Only forwarded messages have a deepHash
   */
  deepHash: z.string().min(1).nullish(),
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
    ) => {
      // typeof arg === 'string' || arg instanceof Date ? new Date(arg + 0) : arg

      if (arg instanceof Date) return arg
      if (typeof arg === 'string') try { arg = parseInt(arg) } catch {}
      if (typeof arg === 'number') return new Date(arg)

      return arg
    },
    z.date()
  ),
  /**
   * ao processes return { Memory, Message, Assignments, Spawns, Output, Error } }
   *
   * This is the output of process, after the action was applied
   */
  output: z.object({
    Memory: z.any().nullish(),
    Messages: z.array(z.any()).nullish(),
    Assignments: z.array(z.any()).nullish(),
    Spawns: z.array(z.any()).nullish(),
    Output: z.any().nullish(),
    Patches: z.array(z.any()).nullish(),
    GasUsed: z.number().nullish(),
    Error: z.any().nullish()
  })
})
