import { worker } from 'workerpool'

import { hashChain } from './main.js'

/**
 * Expose worker api
 */
worker({ hashChain })
