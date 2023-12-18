import pgPromise from 'pg-promise'

/**
 * TODO: these credentials should be injected,
 *
 * but for now just keeping as is to minimize the diff
 */

const pgp = pgPromise()
const db = pgp(process.env.MU_DATABASE_URL)
export default db
