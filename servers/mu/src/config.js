import path from 'node:path'
import fs from 'node:fs'

import { z } from 'zod'
import { cpus, tmpdir } from 'node:os'

const walletPath = process.env.PATH_TO_WALLET
const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

const positiveIntSchema = z.preprocess((val) => {
  if (val == null) return -1
  if (typeof val === 'number') return val
  return typeof val === 'string' ? parseInt(val.replaceAll('_', '')) : -1
}, z.number().nonnegative())

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
  MU_WALLET: z.record(z.any()),
  SCHEDULED_INTERVAL: z.number(),
  DUMP_PATH: z.string(),
  GRAPHQL_URL: z.string(),
  UPLOADER_URL: z.string(),
  PROC_FILE_PATH: z.string(),
  CRON_CURSOR_DIR: z.string(),
  MAX_WORKERS: positiveIntSchema,
  DB_URL: z.string(),
  TASK_QUEUE_MAX_RETRIES: z.number(),
  TASK_QUEUE_RETRY_DELAY: z.number()
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
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'https://goldsky.arweave.net/graphql',
    SCHEDULED_INTERVAL: process.env.SCHEDULED_INTERVAL || 500,
    DUMP_PATH: process.env.DUMP_PATH || '',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    PROC_FILE_PATH: process.env.PROC_FILE_PATH || 'procs.json',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || tmpdir(),
    MAX_WORKERS: process.env.MAX_WORKERS || Math.max(cpus().length - 1, 1),
    DB_URL: process.env.DB_URL || 'ao-cache',
    TASK_QUEUE_MAX_RETRIES: process.env.TASK_QUEUE_MAX_RETRIES || 5,
    TASK_QUEUE_RETRY_DELAY: process.env.TASK_QUEUE_RETRY_DELAY || 1000
  },
  production: {
    MODE,
    port: process.env.PORT || 3005,
    ENABLE_METRICS_ENDPOINT: process.env.ENABLE_METRICS_ENDPOINT,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL,
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'https://goldsky.arweave.net/graphql',
    SCHEDULED_INTERVAL: process.env.SCHEDULED_INTERVAL || 500,
    DUMP_PATH: process.env.DUMP_PATH || '',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    PROC_FILE_PATH: process.env.PROC_FILE_PATH || 'procs.json',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || tmpdir(),
    MAX_WORKERS: process.env.MAX_WORKERS || Math.max(cpus().length - 1, 1),
    DB_URL: process.env.DB_URL || 'ao-cache',
    TASK_QUEUE_MAX_RETRIES: process.env.TASK_QUEUE_MAX_RETRIES || 5,
    TASK_QUEUE_RETRY_DELAY: process.env.TASK_QUEUE_RETRY_DELAY || 1000
  }
}

export const config = serverConfigSchema.parse(CONFIG_ENVS[MODE])
