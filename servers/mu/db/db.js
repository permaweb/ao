import pgPromise from 'pg-promise';
import dotenv from 'dotenv';

dotenv.config();

const pgp = pgPromise()
const db = pgp(process.env.MU_DATABASE_URL)
export default db