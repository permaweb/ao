import path from 'node:path'
import fs from 'node:fs'
import { cpus, tmpdir } from 'node:os'

import { z, ZodIssueCode } from 'zod'
import { pipe } from 'ramda'

import { preprocessUrls } from './domain/utils.js'

const walletPath = process.env.PATH_TO_WALLET
const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

const positiveIntSchema = z.preprocess((val) => {
  if (val == null) return -1
  if (typeof val === 'number') return val
  return typeof val === 'string' ? parseInt(val.replaceAll('_', '')) : -1
}, z.number().nonnegative())

const jsonObjectSchema = z.preprocess((val) => {
  if (typeof val === 'string') {
    try {
      return JSON.parse(val)
    } catch (error) {
      return {} // Default to an empty object if parsing fails
    }
  }
  return val
}, z.any())

/**
 * Some frameworks will implicitly override NODE_ENV
 *
 * This causes some wackiness with different parts of the same process
 * thinking NODE_ENV is different values.
 *
 * So instead, we use a NODE_CONFIG_ENV environment variable
 * to distinguish which environment config to use. This seems to be a common convention
 * (see https://github.com/node-config/node-config/wiki/Environment-Variables#node_config_env)
 */
const MODE = process.env.NODE_CONFIG_ENV

if (!MODE) throw new Error('NODE_CONFIG_ENV must be defined')

export const domainConfigSchema = z.object({
  CU_URL: z.string().url('CU_URL must be a a valid URL'),
  HB_URL: z.string().url('HB_URL must be a a valid URL').optional(),
  MU_WALLET: z.record(z.any()),
  SCHEDULED_INTERVAL: z.number(),
  DUMP_PATH: z.string(),
  /**
   * The url for the graphql server to be used by the MU
   * to query for metadata from an Arweave Gateway
   *
   * ie. https://arweave.net/graphql
   */
  GRAPHQL_URL: z.string().url('GRAPHQL_URL must be a valid URL'),
  /**
   * The url for the server that hosts the Arweave http API
   *
   * ie. https://arweave.net
   */
  ARWEAVE_URL: z.string().url('ARWEAVE_URL must be a valid URL'),
  UPLOADER_URL: z.string(),
  PROC_FILE_PATH: z.string(),
  CRON_CURSOR_DIR: z.string(),
  MAX_WORKERS: positiveIntSchema,
  DB_URL: z.string(),
  TRACE_DB_URL: z.string(),
  TASK_QUEUE_MAX_RETRIES: positiveIntSchema,
  TASK_QUEUE_RETRY_DELAY: positiveIntSchema,
  DISABLE_TRACE: z.boolean(),
  SPAWN_PUSH_ENABLED: z.boolean(),
  ALLOW_PUSHES_AFTER: positiveIntSchema,
  ENABLE_MESSAGE_RECOVERY: z.boolean(),
  GET_RESULT_MAX_RETRIES: positiveIntSchema,
  GET_RESULT_RETRY_DELAY: positiveIntSchema,
  MESSAGE_RECOVERY_MAX_RETRIES: positiveIntSchema,
  MESSAGE_RECOVERY_RETRY_DELAY: positiveIntSchema,
  RELAY_MAP: jsonObjectSchema,
  ENABLE_PUSH: z.boolean(),
  ENABLE_CUSTOM_PUSH: z.boolean(),
  CUSTOM_CU_MAP_FILE_PATH: z.string(),
  IP_WALLET_RATE_LIMIT: positiveIntSchema,
  IP_WALLET_RATE_LIMIT_INTERVAL: positiveIntSchema,
  STALE_CURSOR_RANGE: positiveIntSchema
})

/**
 * The server config is an extension of the config required by the domain (business logic).
 * This prevents our domain from being aware of the environment it is running in ie.
 * An express server. Later, it could be anything
 */
const serverConfigSchema = domainConfigSchema.extend({
  MODE: z.enum(['development', 'production']),
  port: z.preprocess((val) => {
    if (!val) return -1
    if (typeof val === 'number') return val
    return typeof val === 'string' ? parseInt(val) : -1
  }, z.number().positive()),
  ENABLE_METRICS_ENDPOINT: z.preprocess((val) => !!val, z.boolean())
})

/**
 * @type {z.infer<typeof serverConfigSchema>}
 *
 * We get some nice Intellisense by defining the type in JSDoc
 * before parsing with the serverConfig schema
 */
const CONFIG_ENVS = {
  development: {
    MODE,
    port: process.env.PORT || 3005,
    ENABLE_METRICS_ENDPOINT: process.env.ENABLE_METRICS_ENDPOINT,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL || 'http://localhost:6363',
    HB_URL: process.env.HB_URL || 'http://localhost:8734',
    GATEWAY_URL: process.env.GATEWAY_URL || 'https://arweave.net',
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    ARWEAVE_URL: process.env.ARWEAVE_URL,
    SCHEDULED_INTERVAL: process.env.SCHEDULED_INTERVAL || 500,
    DUMP_PATH: process.env.DUMP_PATH || '',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    PROC_FILE_PATH: process.env.PROC_FILE_PATH || 'procs.json',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || tmpdir(),
    MAX_WORKERS: process.env.MAX_WORKERS || Math.max(cpus().length - 1, 1),
    DB_URL: process.env.DB_URL || 'ao-cache',
    TRACE_DB_URL: process.env.TRACE_DB_URL || 'trace',
    TASK_QUEUE_MAX_RETRIES: process.env.TASK_QUEUE_MAX_RETRIES || 5,
    TASK_QUEUE_RETRY_DELAY: process.env.TASK_QUEUE_RETRY_DELAY || 1000,
    DISABLE_TRACE: process.env.DISABLE_TRACE !== 'false',
    SPAWN_PUSH_ENABLED: process.env.SPAWN_PUSH_ENABLED === 'true',
    ALLOW_PUSHES_AFTER: process.env.ALLOW_PUSHES_AFTER || 1580000,
    ENABLE_MESSAGE_RECOVERY: process.env.ENABLE_MESSAGE_RECOVERY === 'true',
    GET_RESULT_MAX_RETRIES: process.env.GET_RESULT_MAX_RETRIES || 5,
    GET_RESULT_RETRY_DELAY: process.env.GET_RESULT_RETRY_DELAY || 1000,
    MESSAGE_RECOVERY_MAX_RETRIES: process.env.MESSAGE_RECOVERY_MAX_RETRIES || 17,
    MESSAGE_RECOVERY_RETRY_DELAY: process.env.MESSAGE_RECOVERY_RETRY_DELAY || 1000,
    RELAY_MAP: process.env.RELAY_MAP || '',
    ENABLE_PUSH: process.env.ENABLE_PUSH === 'true',
    ENABLE_CUSTOM_PUSH: process.env.ENABLE_CUSTOM_PUSH === 'true',
    CUSTOM_CU_MAP_FILE_PATH: process.env.CUSTOM_CU_MAP_FILE_PATH || 'custom-cu-map.json',
    IP_WALLET_RATE_LIMIT: process.env.IP_WALLET_RATE_LIMIT || 2000,
    IP_WALLET_RATE_LIMIT_INTERVAL: process.env.IP_WALLET_RATE_LIMIT_INTERVAL || 1000 * 60 * 60,
    STALE_CURSOR_RANGE: process.env.STALE_CURSOR_RANGE || 7 * 24 * 60 * 60 * 1000
  },
  production: {
    MODE,
    port: process.env.PORT || 3005,
    ENABLE_METRICS_ENDPOINT: process.env.ENABLE_METRICS_ENDPOINT,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL,
    HB_URL: process.env.HB_URL || 'https://forward.computer',
    GATEWAY_URL: process.env.GATEWAY_URL || 'https://arweave.net',
    GRAPHQL_URL: process.env.GRAPHQL_URL,
    ARWEAVE_URL: process.env.ARWEAVE_URL,
    SCHEDULED_INTERVAL: process.env.SCHEDULED_INTERVAL || 500,
    DUMP_PATH: process.env.DUMP_PATH || '',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    PROC_FILE_PATH: process.env.PROC_FILE_PATH || 'procs.json',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || tmpdir(),
    MAX_WORKERS: process.env.MAX_WORKERS || Math.max(cpus().length - 1, 1),
    DB_URL: process.env.DB_URL || 'ao-cache',
    TRACE_DB_URL: process.env.TRACE_DB_URL || 'trace',
    TASK_QUEUE_MAX_RETRIES: process.env.TASK_QUEUE_MAX_RETRIES || 5,
    TASK_QUEUE_RETRY_DELAY: process.env.TASK_QUEUE_RETRY_DELAY || 1000,
    DISABLE_TRACE: process.env.DISABLE_TRACE !== 'false',
    SPAWN_PUSH_ENABLED: process.env.SPAWN_PUSH_ENABLED === 'true',
    ALLOW_PUSHES_AFTER: process.env.ALLOW_PUSHES_AFTER || 1580000,
    ENABLE_MESSAGE_RECOVERY: process.env.ENABLE_MESSAGE_RECOVERY === 'true',
    GET_RESULT_MAX_RETRIES: process.env.GET_RESULT_MAX_RETRIES || 5,
    GET_RESULT_RETRY_DELAY: process.env.GET_RESULT_RETRY_DELAY || 1000,
    MESSAGE_RECOVERY_MAX_RETRIES: process.env.MESSAGE_RECOVERY_MAX_RETRIES || 17,
    MESSAGE_RECOVERY_RETRY_DELAY: process.env.MESSAGE_RECOVERY_RETRY_DELAY || 1000,
    RELAY_MAP: process.env.RELAY_MAP || '',
    ENABLE_PUSH: process.env.ENABLE_PUSH === 'true',
    ENABLE_CUSTOM_PUSH: process.env.ENABLE_CUSTOM_PUSH === 'true',
    CUSTOM_CU_MAP_FILE_PATH: process.env.CUSTOM_CU_MAP_FILE_PATH || 'custom-cu-map.json',
    IP_WALLET_RATE_LIMIT: process.env.IP_WALLET_RATE_LIMIT || 2000,
    IP_WALLET_RATE_LIMIT_INTERVAL: process.env.IP_WALLET_RATE_LIMIT_INTERVAL || 1000 * 60 * 60,
    STALE_CURSOR_RANGE: process.env.STALE_CURSOR_RANGE || 7 * 24 * 60 * 60 * 1000
  }
}

const preprocessedServerConfigSchema = z.preprocess(
  (envConfig, zodRefinementContext) => {
    try {
      return pipe(preprocessUrls)(envConfig)
    } catch (message) {
      zodRefinementContext.addIssue({ code: ZodIssueCode.custom, message })
    }
  },
  serverConfigSchema
)

export const config = preprocessedServerConfigSchema.parse(CONFIG_ENVS[MODE])
