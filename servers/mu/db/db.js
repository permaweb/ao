import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise()
const db = pgp({
    connectionString: process.env.MU_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
});
export default db