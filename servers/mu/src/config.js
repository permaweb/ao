import path from 'node:path'
import fs from 'node:fs'

import { z } from 'zod'

const walletPath = process.env.PATH_TO_WALLET
const walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'))

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
  MAX_WORKERS: z.number()
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
  }, z.number().positive())
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
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL || 'http://localhost:6363',
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'https://goldsky.arweave.net/graphql',
    SCHEDULED_INTERVAL: process.env.SCHEDULED_INTERVAL || 500,
    DUMP_PATH: process.env.DUMP_PATH || '',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    PROC_FILE_PATH: process.env.PROC_FILE_PATH || 'procs.json',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || 'cursor.txt',
    MAX_WORKERS: process.env.MAX_WORKERS || 2
  },
  production: {
    MODE,
    port: process.env.PORT || 3005,
    MU_WALLET: walletKey,
    CU_URL: process.env.CU_URL,
    GRAPHQL_URL: process.env.GRAPHQL_URL || 'https://goldsky.arweave.net/graphql',
    SCHEDULED_INTERVAL: process.env.SCHEDULED_INTERVAL || 500,
    DUMP_PATH: process.env.DUMP_PATH || '',
    UPLOADER_URL: process.env.UPLOADER_URL || 'https://up.arweave.net',
    PROC_FILE_PATH: process.env.PROC_FILE_PATH || 'procs.json',
    CRON_CURSOR_DIR: process.env.CRON_CURSOR_DIR || 'cursor.txt',
    MAX_WORKERS: process.env.MAX_WORKERS || 2
  }
}

export const config = serverConfigSchema.parse(CONFIG_ENVS[MODE])
