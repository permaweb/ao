import {Knex} from "knex";
import {Benchmark, LoggerFactory} from "warp-contracts";
import { createHash } from 'crypto'

export class LastTxSync {

  private readonly logger = LoggerFactory.INST.create(LastTxSync.name);

  async acquireMutex(contractTxId: string, trx: Knex.Transaction): Promise<string | null> {
    const lockId = this.strToKey(contractTxId);
    this.logger.debug('Locking for', {
      contractTxId,
      lockId
    });

    // https://stackoverflow.com/a/20963803
    const benchmark = Benchmark.measure();
    await trx.raw(`SET LOCAL lock_timeout = '2s';`)

    await trx.raw(`
      SELECT pg_advisory_xact_lock(?, ?);
    `, [lockId[0], lockId[1]]);
    this.logger.debug("Acquiring pg_advisory_xact_lock", benchmark.elapsed());

    return this.loadLastSortKey(contractTxId, trx);
  }

  private async loadLastSortKey(contractTxId: string, trx: Knex.Transaction): Promise<string | null> {
    const benchmark = Benchmark.measure();
    const result = await trx.raw(
      `SELECT max(sort_key) AS "lastSortKey"
       FROM interactions
       WHERE contract_id = ?`,
      [contractTxId]
    );
    this.logger.debug("Loading lastSortKey", benchmark.elapsed());

    // note: this will return null if we're registering the very first tx for the contract
    return result?.rows[0].lastSortKey;
  }

  // https://github.com/binded/advisory-lock/blob/master/src/index.js#L8
  private strToKey(id: string) {
    const buf = createHash('sha256').update(id).digest()
    // Read the first 4 bytes and the next 4 bytes
    // The parameter here is the byte offset, not the sizeof(int32) offset
    return [buf.readInt32LE(0), buf.readInt32LE(4)]
  }
}
