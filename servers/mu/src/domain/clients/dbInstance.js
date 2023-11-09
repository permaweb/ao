import pgPromise from 'pg-promise';

const pgp = pgPromise();
const db = pgp(process.env.MU_DATABASE_URL);

const maxRetries = 5; 
const retryDelay = 500; 

async function withRetry(operation, args, retryCount = 0) {
  try {
    return await operation(...args);
  } catch (error) {
    if (error.message.includes('Connection terminated unexpectedly') && retryCount < maxRetries) {
      const delay = retryDelay * Math.pow(2, retryCount);
      console.log(`Database connection was lost, retrying in ${delay} ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(operation, args, retryCount + 1);
    } else {
      throw error;
    }
  }
}

export async function getTx(id) {
  return withRetry(db.oneOrNone, ['SELECT * FROM "transactions" WHERE "_id" = $1', [id]]);
}

export async function putTx(doc) {
  return withRetry(db.none, [
    'INSERT INTO "transactions" ("_id", "data", "processId", "cachedAt") VALUES ($1, $2, $3, $4)',
    [doc._id, JSON.stringify(doc.data), doc.processId, doc.cachedAt]
  ]);
}

export async function findTx(id) {
  return withRetry(db.any, ['SELECT * FROM "transactions" WHERE "_id" = $1', [id]]);
}

export async function putMsg(doc) {
  return withRetry(db.none, [
    'INSERT INTO "messages" ("_id", "fromTxId", "toTxId", "msg", "cachedAt") VALUES ($1, $2, $3, $4, $5)',
    [doc._id, doc.fromTxId, doc.toTxId, JSON.stringify(doc.msg), doc.cachedAt]
  ]);
}

export async function getMsg(id) {
  return withRetry(db.oneOrNone, ['SELECT * FROM "messages" WHERE "_id" = $1', [id]]);
}

export async function findMsgs(fromTxId) {
  return withRetry(db.any, ['SELECT * FROM "messages" WHERE "fromTxId" = $1', [fromTxId]]);
}

export async function putSpawn(doc) {
  return withRetry(db.none, [
    'INSERT INTO "spawns" ("_id", "fromTxId", "toTxId", "spawn", "cachedAt") VALUES ($1, $2, $3, $4, $5)',
    [doc._id, doc.fromTxId, doc.toTxId, JSON.stringify(doc.spawn), doc.cachedAt]
  ]);
}

export async function findSpawns(fromTxId) {
  return withRetry(db.any, ['SELECT * FROM "spawns" WHERE "fromTxId" = $1', [fromTxId]]);
}

export async function putMonitor(doc) {
    const operation = async () => {
      const existingMonitor = await db.oneOrNone('SELECT * FROM "monitored_processes" WHERE "_id" = $1', [doc._id]);
  
      if (existingMonitor) {
        await db.none(
          'UPDATE "monitored_processes" SET "lastFromSortKey" = $1 WHERE "_id" = $2',
          [doc.lastFromSortKey, doc._id]
        );
      } else {
        await db.none(
          'INSERT INTO "monitored_processes" ("_id", "authorized", "lastFromSortKey", "interval", "block", "createdAt") VALUES ($1, $2, $3, $4, $5, $6)',
          [doc._id, doc.authorized, doc.lastFromSortKey, doc.interval, JSON.stringify(doc.block), doc.createdAt]
        );
      }
  
      return doc;
    };
  
    return withRetry(operation, []);
}  

export async function getMonitor(id) {
  return withRetry(db.oneOrNone, ['SELECT * FROM "monitored_processes" WHERE "_id" = $1', [id]]);
}

export async function findMonitors() {
  return withRetry(async () => {
    const docs = await db.any('SELECT * FROM "monitored_processes"');
    return {
      docs: docs.map(doc => ({
        ...doc,
        createdAt: parseInt(doc.createdAt)
      }))
    };
  }, []);
}

export default {
  getTx,
  putTx,
  findTx,
  putMsg,
  getMsg,
  getMonitor,
  findMsgs,
  putSpawn,
  findSpawns,
  putMonitor,
  findMonitors,
};
