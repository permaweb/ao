async function up(db) {
    await db.none(`
        ALTER TABLE "spawns" ADD COLUMN IF NOT EXISTS "processId" VARCHAR
    `)
    await db.none(`
        ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "processId" VARCHAR
    `)
  }
  
  async function down(db) {
    await db.none(`
        ALTER TABLE "spawns" DROP COLUMN IF EXISTS "processId"
    `)
    await db.none(`
        ALTER TABLE "messages" DROP COLUMN IF EXISTS "processId"
    `)
  }
  
  export default {
    up,
    down,
    name: 'add_spawns_processid'
  }
  