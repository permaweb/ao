import { DatabaseSource } from '../src/db/databaseSource';
import fs from 'fs';

async function connectToDb() {
  require('dotenv').config({
    path: '.secrets/local.env',
  });

  const dbSource = new DatabaseSource([
    {
      client: 'pg',
      url: process.env.DB_URL_MIGRATED as string,
      ssl: {
        rejectUnauthorized: false,
        ca: fs.readFileSync('.secrets/ca.pem'),
        cert: fs.readFileSync('.secrets/cert.pem'),
        key: fs.readFileSync('.secrets/key.pem'),
      },
      primaryDb: true,
    },
  ]);

  const result = await dbSource.raw(`select contract_id from contracts limit 1;`);

  console.log(result.rows[0]);

  process.exit(0);
}

connectToDb()
  .then(() => console.log('contract_tx column update completed.'))
  .catch((e) => console.error(e));
