import db from './db.js'

import createInitialMigrations from './migrations/20231031_create_initial_tables.js'
import dropTransactionTable from './migrations/20231110_drop_transaction_table.js'
import addProcessIdToSpawns from './migrations/20231116_add_processid_to_spawn.js'
import addMessageTracesTable from './migrations/20231206_create_message_traces_table.js'
import modifyMonitorTable from './migrations/20231219_modify_monitor_table.js'
import addInitialTxId from './migrations/20240115_add_initial_txid_column.js'
import addLastFromCursor from './migrations/20240123_add_last_from_cursor.js'

const migrations = [
  addLastFromCursor,
  addInitialTxId,
  modifyMonitorTable,
  addMessageTracesTable,
  addProcessIdToSpawns,
  dropTransactionTable,
  createInitialMigrations
]

async function revertMigrations () {
  // Iterate over migrations in reverse order
  for (const migration of migrations) {
    await migration.down(db)
    console.log(`Reverted migration: ${migration.name}`)
  }
}

revertMigrations()
  .then(() => {
    console.log('All migrations reverted successfully.')
    process.exit(0)
  })
  .catch((error) => {
    console.error('Error in reverting migrations:', error)
    process.exit(1)
  })
