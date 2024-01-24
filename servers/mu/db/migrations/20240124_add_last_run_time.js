async function up (db) {
  await db.none(`
        ALTER TABLE "monitored_processes"
        ADD COLUMN IF NOT EXISTS "lastRunTime" BIGINT
    `)
}

async function down (db) {
  await db.none(`
        ALTER TABLE "monitored_processes"
        DROP COLUMN IF EXISTS "lastRunTime"
    `)
}

export default {
  up,
  down,
  name: 'add_last_run_time'
}
