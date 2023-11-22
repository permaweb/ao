import pgPromise from 'pg-promise'

/**
 * TODO: these credentials should be injected,
 *
 * but for now just keeping as is to minimize the diff
 */
import { config } from '../src/config.js'

const pgp = pgPromise()
const db = pgp(config.MU_DATABASE_URL)
export default db
