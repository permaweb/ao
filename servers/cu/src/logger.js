import { hostname } from 'node:os'
import { createLogger } from './domain/index.js'

export const logger = createLogger(`ao-cu:${hostname()}`)
