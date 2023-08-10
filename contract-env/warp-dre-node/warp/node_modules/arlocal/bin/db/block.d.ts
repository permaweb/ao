import { Knex } from 'knex';
export declare class BlockDB {
    private connection;
    constructor(connection: Knex);
    getOne(): Promise<any[]>;
    getByIndepHash(indepHash: string): Promise<any>;
    mine(height: number, previous: string, txs: string[]): Promise<string>;
    getLastBlock(): Promise<any>;
    getByHeight(height: number): Promise<any>;
    /**
     *
     * @param id Genesis block ID/indep_hash
     */
    insertGenesis(id: string): Promise<void>;
}
