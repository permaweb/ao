/**
 * DeepHashChunk recusrive type.
 */
declare type DeepHashChunk = Uint8Array | DeepHashChunks;
interface DeepHashChunks extends Array<DeepHashChunk> {
}
/**
 * deep hash function
 */
export declare type deepHash = (chunk: DeepHashChunk) => Promise<Uint8Array>;
export {};
