import db from './db.js';

import createInitialMigrations from './migrations/20231031_create_initial_tables.js';

const migrations = [
  createInitialMigrations,
];

async function runMigrationByName(migrationName) {
  const migration = migrations.find((m) => m.name === migrationName);

  if (!migration) {
    console.error(`Migration with name "${migrationName}" not found.`);
    throw new Error('No migration found');
  }

  try {
    await migration.down(db);
    console.log(`Rolled back migration: ${migration.name}`);
  } catch (error) {
    console.error(`Error rolling back migration ${migration.name}:`, error);
    throw new Error('Error rolling back migration');
  }
}

const args = process.argv.slice(2);
if (args.length !== 1) {
  console.error('Usage: node rollback.js <migrationName>');
  process.exit(1);
}

const migrationName = args[0];

runMigrationByName(migrationName)
  .then(() => {
    console.log('Migration rolled back successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Rollback error:', error);
    process.exit(1);
  });