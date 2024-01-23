async function up (db) {
  await db.none(`
        ALTER TABLE "monitored_processes"
        DROP COLUMN IF EXISTS "lastFromTimestamp"
      `)

  await db.none(`
        ALTER TABLE "monitored_processes"
        ADD COLUMN IF NOT EXISTS "lastFromCursor" TEXT
      `)
}

async function down (db) {
  await db.none(`
        ALTER TABLE "monitored_processes"
        ADD COLUMN "lastFromTimestamp" BIGINT
      `)

  await db.none(`
      ALTER TABLE "monitored_processes"
      DROP COLUMN IF EXISTS lastFromCursor
    `)
}

export default {
  up,
  down,
  name: 'add_last_from_cursor'
}
