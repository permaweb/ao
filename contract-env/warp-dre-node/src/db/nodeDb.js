const knex = require('knex');
const { signState } = require('../signature');
const { config } = require('../config');
const logger = require('../logger')('node-db');

let eventsDb = null;
let stateDb = null;

module.exports = {
  createNodeDbEventsTables: async (knex) => {
    const hasEventsTable = await knex.schema.hasTable('events');
    if (!hasEventsTable) {
      await knex.schema.createTable('events', function (t) {
        t.string('contract_tx_id').notNullable().index();
        t.string('event').notNullable().index();
        t.timestamp('timestamp').defaultTo(knex.fn.now()).index();
        t.string('message');
      });
    }
  },

  createNodeDbTables: async (knex) => {
    const hasErrorsTable = await knex.schema.hasTable('errors');
    if (!hasErrorsTable) {
      await knex.schema.createTable('errors', function (t) {
        t.string('contract_tx_id').index();
        t.jsonb('evaluation_options');
        t.jsonb('sdk_config');
        t.string('job_id').unique();
        t.string('failure').notNullable();
        t.timestamp('timestamp').defaultTo(knex.fn.now());
      });
    }

    const hasBlacklistTable = await knex.schema.hasTable('black_list');
    if (!hasBlacklistTable) {
      await knex.schema.createTable('black_list', function (t) {
        t.string('contract_tx_id').unique();
        t.integer('failures');
      });
    }

    const hasStatesTable = await knex.schema.hasTable('states');
    if (!hasStatesTable) {
      await knex.schema.createTable('states', function (t) {
        t.string('contract_tx_id').unique();
        t.jsonb('manifest').notNullable();
        t.string('bundle_tx_id');
        t.string('sort_key');
        t.string('signature').notNullable();
        t.string('state_hash').notNullable();
        t.timestamp('timestamp').defaultTo(knex.fn.now());
        t.jsonb('state').notNullable();
        t.jsonb('validity').notNullable();
        t.jsonb('error_messages').notNullable();
        t.unique(['contract_tx_id', 'sort_key']);
      });
    }

    // Trigger for ensuring only the newest state is stored
    await knex.raw(`
    CREATE TRIGGER IF NOT EXISTS reject_outdated_state
    BEFORE UPDATE
      ON states
    BEGIN
      SELECT CASE
      WHEN (EXISTS (SELECT 1 FROM states WHERE states.contract_tx_id = NEW.contract_tx_id AND states.sort_key > NEW.sort_key))
      THEN RAISE(ABORT, 'Outdated sort_key')
      END;
    END;`);
  },

  connect: () => {
    if (stateDb == null) {
      stateDb = knex({
        client: 'better-sqlite3',
        connection: {
          filename: `sqlite/node.sqlite`
        },
        useNullAsDefault: true
        /*pool: {
          afterCreate: (conn, cb) => {
            // https://github.com/knex/knex/issues/4971#issuecomment-1030701574
            conn.pragma('journal_mode = WAL');
            cb();
          }
        }*/
      });
    }
    return stateDb;
  },

  connectEvents: () => {
    if (eventsDb == null) {
      eventsDb = knex({
        client: 'better-sqlite3',
        connection: {
          filename: `sqlite/node-events.sqlite`
        },
        useNullAsDefault: true,
        pool: {
          afterCreate: (conn, cb) => {
            // https://github.com/knex/knex/issues/4971#issuecomment-1030701574
            conn.pragma('journal_mode = WAL');
            cb();
          }
        }
      });
    }
    return eventsDb;
  },

  insertFailure: async (nodeDb, failureInfo) => {
    await nodeDb('errors').insert(failureInfo).onConflict(['job_id']).ignore();
  },

  insertState: async (nodeDb, contractTxId, readResult) => {
    const manifest = await config.nodeManifest;
    const { sig, stateHash } = await signState(
      contractTxId,
      readResult.sortKey,
      readResult.cachedValue.state,
      manifest
    );

    const entry = {
      contract_tx_id: contractTxId,
      manifest: manifest,
      sort_key: readResult.sortKey,
      signature: sig,
      state_hash: stateHash,
      state: readResult.cachedValue.state,
      validity: readResult.cachedValue.validity,
      error_messages: readResult.cachedValue.errorMessages
    };

    await nodeDb('states').insert(entry).onConflict(['contract_tx_id']).merge();

    return entry;
  },

  deleteStates: async (nodeDb, contractTxId) => {
    await nodeDb.raw(`DELETE FROM states WHERE contract_tx_id = ?;`, [contractTxId]);
  },

  upsertBlacklist: async (nodeDb, contractTxId) => {
    await nodeDb.raw(
      `INSERT OR
         REPLACE
         INTO black_list
        VALUES (?,
                COALESCE(
                        (SELECT failures
                         FROM black_list
                         WHERE contract_tx_id = ?),
                        0) + 1);`,
      [contractTxId, contractTxId]
    );
  },

  deleteBlacklist: async (nodeDb, contractTxId) => {
    await nodeDb.raw(`DELETE FROM black_list WHERE contract_tx_id = ?;`, [contractTxId]);
  },

  doBlacklist: async (nodeDb, contractTxId, failures) => {
    await nodeDb.raw(
      `INSERT OR
         REPLACE
         INTO black_list
        VALUES (?, ?)`,
      [contractTxId, failures]
    );
  },

  getFailures: async (nodeDb, contractTxId) => {
    const result = await nodeDb('black_list')
      .where({
        contract_tx_id: contractTxId
      })
      .first('failures');

    return result?.failures;
  },

  getAllBlacklisted: async (nodeDb) => {
    return nodeDb('black_list').select('contract_tx_id', 'failures');
  },

  getAllErrors: async (nodeDb) => {
    return nodeDb('errors').select('*');
  },

  getContractErrors: async (nodeDb, contractTxId) => {
    return nodeDb('errors')
      .where({
        contract_tx_id: contractTxId
      })
      .select('*')
      .orderBy('timestamp', 'desc');
  },

  deleteErrors: async (nodeDb, contractTxId) => {
    await nodeDb.raw(`DELETE FROM errors WHERE contract_tx_id = ?;`, [contractTxId]);
  },

  deleteEvents: async (contractTxId) => {
    await eventsDb.raw('DELETE FROM events WHERE contract_tx_id = ?;', [contractTxId]);
  },

  getLastStateFromDreCache: async (nodeDb, contractTxId) => {
    const result = await nodeDb('states')
      .where({
        contract_tx_id: contractTxId
      })
      .first('*')
      .orderBy('sort_key', 'desc');

    return result;
  },

  getAllContracts: async (nodeDb) => {
    return nodeDb('states').distinct('contract_tx_id').pluck('contract_tx_id');
  },

  hasContract: async (nodeDb, contractTxId) => {
    return (
      (await nodeDb('states')
        .where({
          contract_tx_id: contractTxId
        })
        .first()) != null
    );
  },

  events: {
    register: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REQUEST_REGISTER', contractTxId, message).finally(() => {});
    },
    update: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REQUEST_UPDATE', contractTxId, message).finally(() => {});
    },
    reject: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'REJECT', contractTxId, message).finally(() => {});
    },
    failure: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'FAILURE', contractTxId, message).finally(() => {});
    },
    updated: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'UPDATED', contractTxId, message).finally(() => {});
    },
    evaluated: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'EVALUATED', contractTxId, message).finally(() => {});
    },
    blacklisted: (nodeDb, contractTxId, message) => {
      insertEvent(nodeDb, 'BLACKLISTED', contractTxId, message).finally(() => {});
    },
    progress: (contractTxId, message) => {
      insertEvent(module.exports.connectEvents(), 'PROGRESS', contractTxId, message).finally(() => {});
    },
    loadForContract: async (nodeDb, contractTxId) => {
      return nodeDb('events')
        .where({
          contract_tx_id: contractTxId
        })
        .select('*')
        .orderBy('timestamp', 'desc');
    }
  }
};

async function insertEvent(nodeDb, event, contractTxId, message) {
  nodeDb('events')
    .insert({
      contract_tx_id: contractTxId,
      event: event,
      message: message
    })
    .catch(() => {
      logger.error('Error while storing event', { event, contractTxId, message });
    });
}
