async function up(db) {
    await db.none(`
      DROP TABLE IF EXISTS "transactions"
    `)
  }
  
  async function down(db) {
    
  }
  
  export default {
    up,
    down,
    name: 'drop_transactions'
  }
  