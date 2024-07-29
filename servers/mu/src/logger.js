import { createLogger } from './domain/index.js'
import { domainConfigSchema, config } from './config.js'

export const logger = createLogger({
  namespace: 'ao-mu',
  config: domainConfigSchema.parse(config)
})
