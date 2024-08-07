import { createLogger } from './domain/logger.js'
import { domainConfigSchema, config } from './config.js'

const activeTraces = new Map()
export const logger = await createLogger({
  namespace: 'ao-mu',
  config: domainConfigSchema.parse(config),
  activeTraces
})
