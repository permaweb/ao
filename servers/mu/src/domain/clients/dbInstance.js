import pgPromise from 'pg-promise';

const pgp = pgPromise();
const db = pgp(process.env.MU_DATABASE_URL);

console.log('db url')
console.log(process.env.MU_DATABASE_URL)
export async function getTx(id) {
    try {
      const result = await db.oneOrNone('SELECT * FROM transactions WHERE _id = $1', [id]);
      if (result) {
        return result;
      }
      throw { status: 404, message: 'Transaction not found' };
    } catch (error) {
      throw error;
    }
}

export async function putTx(doc) {
    try {
      await db.none(
        'INSERT INTO transactions (_id, data, processId, cachedAt) VALUES ($1, $2, $3, $4)',
        [doc._id, JSON.stringify(doc.data), doc.processId, doc.cachedAt]
      );
      return doc;
    } catch (error) {
      throw error;
    }
}
  

export async function findTx(id) {
    try {
        const docs = await db.any('SELECT * FROM transactions WHERE _id = $1', [id]);
        return { docs };
    } catch (error) {
        throw error;
    }
}


export async function putMsg(doc) {
    try {
        await db.none(
            'INSERT INTO messages (_id, fromTxId, toTxId, msg, cachedAt) VALUES ($1, $2, $3, $4, $5)',
            [doc._id, doc.fromTxId, doc.toTxId, JSON.stringify(doc.msg), doc.cachedAt]
        );
        return doc;
    } catch (error) {
        throw error;
    }
}


export async function getMsg(id) {
    try {
        const result = await db.oneOrNone('SELECT * FROM messages WHERE _id = $1', [id]);
        if (result) {
            return result;
        }
        throw { status: 404, message: 'Message not found' };
    } catch (error) {
        throw error;
    }
}


export async function putSpawn(doc) {
    try {
        await db.none(
            'INSERT INTO spawns (_id, fromTxId, toTxId, spawn, cachedAt) VALUES ($1, $2, $3, $4, $5)',
            [doc._id, doc.fromTxId, doc.toTxId, JSON.stringify(doc.spawn), doc.cachedAt]
        );
        return doc;
    } catch (error) {
        throw error;
    }
}


export async function findSpawns(fromTxId) {
    try {
        const docs = await db.any('SELECT * FROM spawns WHERE fromTxId = $1', [fromTxId]);
        return { docs };
    } catch (error) {
        throw error;
    }
}


export async function putMonitor(doc) {
    try {
        await db.none(
            'INSERT INTO monitored_processes (_id, authorized, lastFromSortKey, interval, block, createdAt) VALUES ($1, $2, $3, $4, $5, $6)',
            [doc._id, doc.authorized, doc.lastFromSortKey, doc.interval, JSON.stringify(doc.block), doc.createdAt]
        );
        return doc;
    } catch (error) {
        throw error;
    }
}


export async function findMonitors() {
    try {
        const docs = await db.any('SELECT * FROM monitored_processes');
        return { docs };
    } catch (error) {
        throw error;
    }
}

export default {
  getTx,
  putTx,
  findTx,
  putMsg,
  getMsg,
  putSpawn,
  findSpawns,
  putMonitor,
  findMonitors,
};