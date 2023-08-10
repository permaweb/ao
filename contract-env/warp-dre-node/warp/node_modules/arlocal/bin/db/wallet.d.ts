import { TransactionType } from '../faces/transaction';
import { Knex } from 'knex';
export interface Wallet {
    address: string;
    balance: number;
}
export declare class WalletDB {
    private connection;
    constructor(connection: Knex);
    addWallet(wallet: Wallet): Promise<number[]>;
    getWallet(address: string): Promise<Wallet>;
    getWalletBalance(address: string): Promise<number>;
    getLastTx(address: string): Promise<TransactionType>;
    updateBalance(address: string, balance: number): Promise<number>;
    incrementBalance(address: string, balance: number): Promise<number>;
    decrementBalance(address: string, balance: number): Promise<number>;
}
