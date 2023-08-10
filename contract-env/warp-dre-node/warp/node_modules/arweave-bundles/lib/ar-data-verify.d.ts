import { Dependencies, DataItemJson } from "./ar-data-base";
export declare const MAX_TAG_KEY_LENGTH_BYTES: number;
export declare const MAX_TAG_VALUE_LENGTH_BYTES: number;
export declare const MAX_TAG_COUNT = 128;
/**
 * Verifies a DataItem is valid.
 *
 * @param deps
 * @param d
 * @param jwk
 */
export declare function verify(deps: Dependencies, d: DataItemJson): Promise<boolean>;
/**
 *
 * Verify an array of tags only contains objects with exactly two keys, `name` and `value`
 * that they are both non-empty strings, and are with the bounds of tag sizes.
 *
 * @param tags
 */
export declare function verifyEncodedTagsArray(deps: Dependencies, tags: any[]): boolean;
/**
 * Verifies the tag name or value does not exceed reasonable bounds in bytes.
 *
 * @param deps
 * @param tag
 */
export declare function verifyEncodedTagSize(deps: Dependencies, tag: {
    name: string;
    value: string;
}): boolean;
