import { TagFilter } from 'graphql/types';
import { Base64UrlEncodedString, WinstonString } from '../utils/encoding';
export interface Tag {
    name: Base64UrlEncodedString;
    value: Base64UrlEncodedString;
}
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
}
export declare function toB64url(input: string): Base64UrlEncodedString;
export declare function tagValue(tags: Tag[], name: string): string;
export declare function tagToUTF8(tags: Tag[]): Tag[];
export declare function tagToB64(tags: TagFilter[]): TagFilter[];
