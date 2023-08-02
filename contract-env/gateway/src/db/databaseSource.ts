import { Knex, knex } from 'knex';
import {
  SequencerInsert,
  InteractionInsert,
  ContractInsert,
  ContractSourceInsert,
  PeerInsert,
} from './insertInterfaces';
import fs from 'fs';
import path from 'path';
import { client } from '../nodemailer/config';
import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { Benchmark, WarpLogger } from 'warp-contracts';

interface DbData {
  client: 'pg';
  url: string;
  ssl?: { ca: string | Buffer; cert: string | Buffer; key: string | Buffer; rejectUnauthorized: boolean };
  options?: Partial<Knex.Config>;
  primaryDb?: boolean;
}

export class DatabaseSource {
  public db: Knex[] = [];
  public primaryDb: Knex | null = null;
  private mailClient: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(dbData: DbData[]) {
    for (let i = 0; i < dbData.length; i++) {
      this.db[i] = this.connectDb(dbData[i]);
      if (dbData[i].primaryDb) {
        if (this.primaryDb != null) {
          throw new Error('Only one db can be set primary!');
        }
        this.primaryDb = this.db[i];
      }
    }
    if (this.primaryDb == null) {
      throw new Error('Exactly one db must be set as primary');
    }
    this.mailClient = client();
  }

  // INSERT

  public async insertSequencer(sequencerInsert: SequencerInsert, trx: Knex.Transaction) {
    await trx('sequencer').insert(sequencerInsert);
  }

  public async insertInteraction(interactionInsert: InteractionInsert, trx: Knex.Transaction) {
    await trx('interactions').insert(interactionInsert);
  }

  public async insertSequencerAndInteraction(
    sequencerInsert: SequencerInsert,
    interactionInsert: InteractionInsert,
    primaryDbTx: Knex.Transaction,
    logger: WarpLogger
  ): Promise<void> {
    try {
      const benchmark = Benchmark.measure();
      await Promise.all([
        await this.insertSequencer(sequencerInsert, primaryDbTx),
        await this.insertInteraction(interactionInsert, primaryDbTx),
      ]);
      await primaryDbTx.commit();
      logger.info('Inserting into primary database', benchmark.elapsed());
    } catch (e: any) {
      await primaryDbTx.rollback();
      throw new Error(e);
    }

    if (this.db.length > 1) {
      const dbWithoutPrimary = this.filterPrimaryDb();
      for (let i = 0; i < dbWithoutPrimary.length; i++) {
        try {
          const benchmark = Benchmark.measure();

          await this.loopDbAndHandleError(
            async (db: Knex, trx: Knex.Transaction) => {
              await Promise.all([
                await this.insertSequencer(sequencerInsert, trx),
                await this.insertInteraction(interactionInsert, trx),
              ]);
            },
            `insert_sequencer_and_interactions_${interactionInsert.interaction_id}`,
            dbWithoutPrimary[i],
            { trx: true }
          );
          logger.info(`Inserting into database: ${i + 1}`, benchmark.elapsed());
        } catch (e) {
          console.log(e);
        }
      }
    }
  }

  public async insertContract(contractInsert: ContractInsert) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('contracts').insert(contractInsert);
    }, `insert_contract_${contractInsert.contract_id}`);
  }

  public async insertContractSource(contractSourceInsert: ContractSourceInsert) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('contracts_src').insert(contractSourceInsert).onConflict('src_tx_id').ignore();
    }, `insert_contract_source_${contractSourceInsert.src_tx_id}`);
  }

  public async insertInteractionsSync(interactionInsert: InteractionInsert[]) {
    return await this.loopThroughDb(async (db: Knex) => {
      return db('interactions')
        .insert(interactionInsert)
        .onConflict('interaction_id')
        .merge([
          'block_id',
          'function',
          'input',
          'contract_id',
          'block_height',
          'block_timestamp',
          'interaction',
          'sort_key',
        ]);
    }, 'insert_interactions_sync');
  }

  public async insertPeer(peerInsert: PeerInsert) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('peers').insert(peerInsert).onConflict(['peer']).merge();
    }, `insert_peer_${peerInsert.peer}`);
  }

  public async insertPeerEror(peer: string) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('peers')
        .insert({
          peer: peer,
          blocks: 0,
          height: 0,
          response_time: 0,
          blacklisted: true,
        })
        .onConflict(['peer'])
        .merge();
    }, `insert_peer_error_${peer}`);
  }

  public async insertContractsMetadata(contractsInserts: any[]) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('contracts').insert(contractsInserts).onConflict('contract_id').ignore();
    }, 'insert_contracts_metadata');
  }

  // UPDATE

  public async updateInteractionConfirmationStatus(
    id: string,
    status: string,
    confirmingPeers: string[],
    confirmations: number[]
  ) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('interactions')
        .where('interaction_id', id)
        .update({
          confirmation_status: status,
          confirming_peer: confirmingPeers.join(','),
          confirmations: confirmations.join(','),
        });
    }, `update_interaction_confirmation_${id}`);
  }

  public async updateNotProcessedInteraction(corruptedId: string) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('interactions').where('interaction_id', corruptedId).update({
        confirmation_status: 'not_processed',
        confirming_peer: null,
        confirmations: null,
      });
    }, `update_not_processed_interaction_${corruptedId}`);
  }

  public async updateContractMetadata(contractId: string, update: any) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('contracts').where('contract_id', '=', contractId).update(update);
    }, `update_contract_metadata_${contractId}`);
  }

  public async updateContractSrc(contractSrcInsert: any) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('contracts_src')
        .insert(contractSrcInsert)
        .onConflict('src_tx_id')
        .merge([
          'src',
          'src_content_type',
          'src_binary',
          'src_wasm_lang',
          'bundler_src_tx_id',
          'bundler_src_node',
          'src_tx',
        ]);
    }, `update_contract_src_${contractSrcInsert.src_tx_id}`);
  }

  // SELECT

  public async selectLastProcessedArweaveInteraction() {
    return await this.loopThroughDb(async (db: Knex) => {
      return db('interactions')
        .select('block_height')
        .where('source', '=', 'arweave')
        .orderBy('block_height', 'desc')
        .limit(1)
        .first();
    }, 'select_last_processed_interaction');
  }

  public async selectLastContract() {
    return await this.loopThroughDb(async (db: Knex) => {
      return await db('contracts')
        .select('block_height')
        .whereNotNull('block_height')
        .andWhere('deployment_type', '=', 'arweave')
        .orderBy('block_height', 'desc')
        .limit(1)
        .first();
    }, 'select_last_contract');
  }

  public async updateContractError(row: any) {
    await this.loopThroughDb(async (db: Knex) => {
      await db('contracts').where('contract_id', '=', row.contract.trim()).update({
        type: 'error',
      });
    }, `update_contract_error_${row.contract}`);
  }

  // DELETE

  public async deletePeers(peersToRemove: string[]) {
    return await this.loopThroughDb(async (db: Knex) => {
      return await db('peers').whereIn('peer', peersToRemove).delete();
    }, 'delete_peers');
  }

  public raw(query: string, bindings?: any, dbIndex?: number) {
    const db = dbIndex ? this.db[dbIndex] : this.primaryDb!!;
    return db.raw(query, bindings);
  }

  public async loopThroughDb(callback: any, recordName: string): Promise<any> {
    let result: any;
    try {
      result = await callback(this.primaryDb, null);
    } catch (e: any) {
      throw new Error(e);
    }

    if (this.db.length > 1) {
      const dbWithoutPrimary = this.filterPrimaryDb();
      for (let i = 0; i < dbWithoutPrimary.length; i++) {
        await this.loopDbAndHandleError(callback, recordName, dbWithoutPrimary[i]);
      }
    }
    return result;
  }

  private connectDb(dbData: DbData): Knex {
    const options = {
      client: dbData.client,
      connection: {
        connectionString: dbData.url,
        ...(dbData.ssl ? { ssl: dbData.ssl } : ''),
      },
      useNullAsDefault: true,
      pool: {
        min: 5,
        max: 30,
        createTimeoutMillis: 3000,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 30000,
        reapIntervalMillis: 1000,
        createRetryIntervalMillis: 100,
        propagateCreateError: false,
      },
      ...dbData.options,
    };
    return knex(options);
  }

  private currentLocalDateWithTime(): string {
    const tzoffset = new Date().getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzoffset).toISOString().substring(0, 19);
  }

  private async loopDbAndHandleError(
    callback: any,
    record: string,
    db: Knex,
    options?: { trx: boolean }
  ): Promise<void> {
    let transaction: Knex.Transaction | undefined;
    if (options?.trx) {
      transaction = await db?.transaction();
    }
    try {
      await callback(db, transaction);
      await transaction?.commit();
    } catch (e) {
      await transaction?.rollback();
      let count = 0;
      const maxRetry = 2;
      while (true) {
        let transaction: Knex.Transaction | undefined;
        if (options?.trx) {
          transaction = await db?.transaction();
        }
        try {
          await callback(db, transaction);
          await transaction?.commit();
          break;
        } catch (e: any) {
          await transaction?.rollback();
          if (++count == maxRetry) {
            const dbErrorDir = 'db_error_log';
            if (!fs.existsSync(dbErrorDir)) {
              fs.mkdirSync(dbErrorDir);
            }
            fs.writeFileSync(path.join(dbErrorDir, `${this.currentLocalDateWithTime()}_${record}`), e.message);

            this.mailClient.sendMail({
              from: 'notifications@warp.cc',
              to: 'asia@warp.cc',
              subject: `Error from Warp Gateway database. ${record}`,
              text: `Error while interacting with the database: ${record}. Please refer to the 'db_error_log' directory. ${e.message}`,
            });
            break;
          }
        }
      }
    }
  }

  private filterPrimaryDb(): Knex[] {
    return this.db.filter((d) => d !== this.primaryDb);
  }
}
