import db from './db.js';

import createInitialMigrations from './migrations/20231031_create_initial_tables.js';
import dropTransactionTable from './migrations/20231110_drop_transaction_table.js';
import addProcessIdToSpawns from './migrations/20231116_add_processid_to_spawn.js';

const migrations = [
  createInitialMigrations,
  dropTransactionTable,
  addProcessIdToSpawns
];

async function runMigrations() {
  for (const migration of migrations) {
    await migration.up(db);
    console.log(`Applied migration: ${migration.name}`);
  }
}

runMigrations()
  .then(() => {
    console.log('All migrations applied successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration error:', error);
    process.exit(1);
  });