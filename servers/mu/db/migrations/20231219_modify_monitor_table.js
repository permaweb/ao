async function up (db) {
  // Delete columns 'lastFromSortKey', 'interval', and 'block'
  await db.none(`
      ALTER TABLE "monitored_processes"
      DROP COLUMN IF EXISTS "lastFromSortKey",
      DROP COLUMN IF EXISTS "interval",
      DROP COLUMN IF EXISTS "block"
    `)

  // Add a new column 'processData' of type JSONB
  await db.none(`
      ALTER TABLE "monitored_processes"
      ADD COLUMN "processData" JSONB NOT NULL,
      ADD COLUMN "lastFromTimestamp" INTEGER NOT NULL
    `)
}

async function down (db) {
  // Add back the columns 'lastFromSortKey', 'interval', and 'block'
  await db.none(`
      ALTER TABLE "monitored_processes"
      ADD COLUMN "lastFromSortKey" VARCHAR(255),
      ADD COLUMN "interval" VARCHAR(255) NOT NULL,
      ADD COLUMN "block" JSONB NOT NULL
    `)

  // Remove the column 'processData'
  await db.none(`
      ALTER TABLE "monitored_processes"
      DROP COLUMN IF EXISTS "processData"
    `)
}

export default {
  up,
  down,
  name: 'alter_monitored_processes'
}
