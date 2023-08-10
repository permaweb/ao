import { Base64UrlEncodedString, WinstonString } from '../utils/encoding';
export interface Tag {
    name: Base64UrlEncodedString;
    value: Base64UrlEncodedString;
}
export interface Transaction {
    format: number;
    id: string;
    signature: string;
    owner: string;
    target: string;
    data: Base64UrlEncodedString;
    reward: WinstonString;
    last_tx: string;
    tags: Tag[];
    quantity: WinstonString;
    data_size: number;
    data_root: string;
    data_tree: string[];
}
export declare type TransactionHeader = Omit<Transaction, 'data'>;
