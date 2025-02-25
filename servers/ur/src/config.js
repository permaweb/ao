import { z } from 'zod'

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

const stringifiedJsonSchema = z.preprocess(
  (val) => JSON.parse(val),
  z.record(z.string())
)

/**
 * The server config is an extension of the config required by the domain (business logic).
 * This prevents our domain from being aware of the environment it is running in ie.
 * An express server. Later, it could be anything
 */
const serverConfigSchema = z.object({
  MODE: z.enum(['development', 'production']),
  port: z.preprocess((val) => {
    if (!val) return -1
    if (typeof val === 'number') return val
    return typeof val === 'string' ? parseInt(val) : -1
  }, z.number().positive()),
  processToHost: stringifiedJsonSchema.nullish(),
  ownerToHost: stringifiedJsonSchema.nullish(),
  fromModuleToHost: stringifiedJsonSchema.nullish(),
  hosts: z.preprocess(
    (arg) => (typeof arg === 'string' ? arg.split(',').map(str => str.trim()) : arg),
    z.array(z.string().url())
  ),
  aoUnit: z.enum(['cu', 'mu']),
  strategy: z.enum(['proxy', 'redirect']),
  surUrl: z.string().url()
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
    hosts: process.env.HOSTS || ['http://127.0.0.1:3005'],
    processToHost: process.env.PROCESS_TO_HOST || JSON.stringify({}),
    ownerToHost: process.env.OWNER_TO_HOST || JSON.stringify({}),
    fromModuleToHost: process.env.FROM_MODULE_TO_HOST || JSON.stringify({}),
    /**
     * default to the CU for no hassle startup in development mode,
     *
     * but should consider setting explicitly in your .env
     */
    aoUnit: process.env.AO_UNIT || 'cu',
    strategy: process.env.STRATEGY || 'proxy',
    surUrl: process.env.SUR_URL
  },
  production: {
    MODE,
    port: process.env.PORT || 3005,
    hosts: process.env.HOSTS,
    processToHost: process.env.PROCESS_TO_HOST || JSON.stringify({}),
    ownerToHost: process.env.OWNER_TO_HOST || JSON.stringify({}),
    fromModuleToHost: process.env.FROM_MODULE_TO_HOST || JSON.stringify({}),
    aoUnit: process.env.AO_UNIT,
    strategy: process.env.STRATEGY || 'proxy',
    surUrl: process.env.SUR_URL
  }
}

export const config = serverConfigSchema.parse(CONFIG_ENVS[MODE])
