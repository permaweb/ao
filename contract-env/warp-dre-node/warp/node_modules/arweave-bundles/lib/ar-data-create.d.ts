import { Dependencies, DataItemJson } from "./ar-data-base";
import { JWKPublicInterface, JWKInterface } from "./interface-jwk";
/**
 * Options for creation of a DataItem
 */
export interface DataItemCreateOptions {
    data: string | Uint8Array;
    target?: string;
    nonce?: string;
    tags?: {
        name: string;
        value: string;
    }[];
}
/**
 * Create a DataItem, encoding tags and data, setting owner, but not
 * sigining it.
 *
 * @param deps
 * @param opts
 * @param jwk
 */
export declare function createData(deps: Dependencies, opts: DataItemCreateOptions, jwk: JWKPublicInterface): Promise<DataItemJson>;
export declare function addTag(deps: Dependencies, d: DataItemJson, name: string, value: string): void;
/**
 * Signs a data item and sets the `signature` and `id` fields to valid values.
 *
 * @param deps
 * @param d
 * @param jwk
 */
export declare function sign(deps: Dependencies, d: DataItemJson, jwk: JWKInterface): Promise<DataItemJson>;
