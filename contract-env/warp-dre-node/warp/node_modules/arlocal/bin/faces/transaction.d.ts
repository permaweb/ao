import { Tag } from '../graphql/types';
import { Base64UrlEncodedString, WinstonString } from '../utils/encoding';
export interface TransactionType {
    format: number;
    id: string;
    height?: number;
    last_tx: string;
    owner: string;
    tags: Tag[];
    target: string;
    quantity: WinstonString;
    data: Base64UrlEncodedString;
    data_size: string;
    data_tree: string[];
    data_root: string;
    reward: string;
    signature: string;
    bundledIn?: string;
}
