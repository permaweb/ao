async function up (db) {
  await db.none(`
          ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "initialTxId" VARCHAR
    `)
  await db.none(`
        ALTER TABLE "spawns" ADD COLUMN IF NOT EXISTS "initialTxId" VARCHAR
    `)
}

async function down (db) {
  await db.none(`
      ALTER TABLE "messages" DROP COLUMN IF EXISTS "initialTxId"
    `)
  await db.none(`
      ALTER TABLE "spawns" DROP COLUMN IF EXISTS "initialTxId"
    `)
}

export default {
  up,
  down,
  name: 'add_initial_txid'
}
