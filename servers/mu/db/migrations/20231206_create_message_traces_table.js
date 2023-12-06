async function up (db) {
  /**
   * Create the message trace table
   *
   * We use the BL schema to enforce non-nulls
   * instead of embedding those constraints into a database
   */
  await db.none(`
    CREATE TABLE "message_traces" (
      "id" SERIAL PRIMARY KEY,
      "_id" VARCHAR(255) NOT NULL UNIQUE,
      "parent" VARCHAR(255),
      "children" VARCHAR(255)[],
      "spawns" VARCHAR(255)[],
      "from" VARCHAR(255),
      "to" VARCHAR(255),
      "msg" JSONB,
      "trace"  VARCHAR(255)[],
      "tracedAt" TIMESTAMP WITH TIME ZONE,
    )
  `)
}

async function down (db) {
  await db.none('DROP TABLE IF EXISTS message_traces')
}

export default {
  up,
  down,
  name: 'create_message_traces_table'
}
