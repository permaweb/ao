import { Knex, knex } from 'knex';
import { ISO8601DateTimeString } from '../utils/encoding';
import { TagFilter } from './types';
export declare type TxSortOrder = 'HEIGHT_ASC' | 'HEIGHT_DESC';
export declare const orderByClauses: {
    HEIGHT_ASC: string;
    HEIGHT_DESC: string;
};
export declare const tagOrderByClauses: {
    HEIGHT_ASC: string;
    HEIGHT_DESC: string;
};
export interface QueryParams {
    to?: string[];
    from?: string[];
    id?: string;
    ids?: string[];
    tags?: TagFilter[];
    limit?: number;
    offset?: number;
    select?: any;
    blocks?: boolean;
    since?: ISO8601DateTimeString;
    sortOrder?: TxSortOrder;
    status?: 'any' | 'confirmed' | 'pending';
    pendingMinutes?: number;
    minHeight?: number;
    maxHeight?: number;
}
export declare function generateQuery(params: QueryParams, connection: Knex): Promise<knex.QueryBuilder>;
export declare const blockOrderByClauses: {
    HEIGHT_ASC: string;
    HEIGHT_DESC: string;
};
export declare type BlockSortOrder = 'HEIGHT_ASC' | 'HEIGHT_DESC';
export interface BlockQueryParams {
    id?: string;
    ids?: string[];
    limit?: number;
    offset?: number;
    select?: any;
    before?: ISO8601DateTimeString;
    sortOrder?: BlockSortOrder;
    minHeight?: number;
    maxHeight?: number;
}
export declare function generateBlockQuery(params: BlockQueryParams, connection: Knex): Promise<knex.QueryBuilder>;
