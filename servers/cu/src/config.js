import { z } from 'zod'

import { domainConfigSchema, positiveIntSchema } from './domain/index.js'

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

/**
 * The server config is an extension of the config required by the domain (business logic).
 * This prevents our domain from being aware of the environment it is running in ie.
 * An express server. Later, it could be anything
 */
const serverConfigSchema = domainConfigSchema.extend({
  MODE: z.enum(['development', 'production']),
  port: positiveIntSchema,
  DUMP_PATH: z.string().min(1)
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
    PROCESS_WASM_HEAP_MAX_SIZE: process.env.PROCESS_WASM_HEAP_MAX_SIZE || 100_000_000, // 100MB
    GATEWAY_URL: process.env.GATEWAY_URL || 'https://arweave.net',
    DB_MODE: process.env.DB_MODE || 'embedded',
    DB_URL: process.env.DB_URL || 'ao-cache',
    DB_MAX_LISTENERS: parseInt(process.env.DB_MAX_LISTENERS || '100'),
    DUMP_PATH: process.env.DUMP_PATH || './static',
    WALLET: process.env.WALLET,
    WASM_MODULE_CACHE_MAX_SIZE: process.env.WASM_MODULE_CACHE_MAX_SIZE || 5
  },
  production: {
    MODE,
    port: process.env.PORT || 3005,
    PROCESS_WASM_HEAP_MAX_SIZE: process.env.PROCESS_WASM_HEAP_MAX_SIZE || 100_000_000, // 100MB
    GATEWAY_URL: process.env.GATEWAY_URL,
    DB_MODE: process.env.DB_MODE || 'remote',
    DB_URL: process.env.DB_URL,
    DB_MAX_LISTENERS: parseInt(process.env.DB_MAX_LISTENERS || 'throw'),
    DUMP_PATH: process.env.DUMP_PATH,
    WALLET: process.env.WALLET,
    WASM_MODULE_CACHE_MAX_SIZE: process.env.WASM_MODULE_CACHE_MAX_SIZE || 5
  }
}

export const config = serverConfigSchema.parse(CONFIG_ENVS[MODE])
