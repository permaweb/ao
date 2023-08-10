/// <reference types="node" />
import { Readable, Transform } from 'stream';
import { Tag } from '../faces/arweave';
export declare type Base64EncodedString = string;
export declare type Base64UrlEncodedString = string;
export declare type WinstonString = string;
export declare type ArString = string;
export declare type ISO8601DateTimeString = string;
export declare type DeepHashChunk = Uint8Array | DeepHashChunks;
export interface DeepHashChunks extends Array<DeepHashChunk> {
}
export declare class Base64DUrlecode extends Transform {
    protected extra: string;
    protected bytesProcessed: number;
    constructor();
    _transform(chunk: Buffer, _: any, cb: () => void): void;
    _flush(cb: () => void): void;
}
export declare function b64UrlToBuffer(b64UrlString: string): Uint8Array;
export declare function b64UrlDecode(b64UrlString: string): string;
export declare function sha256(buffer: Buffer): Buffer;
export declare function toB64url(buffer: Buffer | string): Base64UrlEncodedString;
export declare function fromB64Url(input: Base64UrlEncodedString): Buffer;
export declare function fromB32(input: string): Buffer;
export declare function toB32(input: Buffer): string;
export declare function sha256B64Url(input: Buffer): string;
export declare function streamToBuffer(stream: Readable): Promise<Buffer>;
export declare function streamToString(stream: Readable): Promise<string>;
export declare function bufferToJson<T = any | undefined>(input: Buffer): T;
export declare function jsonToBuffer(input: object): Buffer;
export declare function streamToJson<T = any | undefined>(input: Readable): Promise<T>;
export declare function isValidUTF8(buffer: Buffer): boolean;
export declare function streamDecoderb64url(readable: Readable): Readable;
export declare function bufferToStream(buffer: Buffer): Readable;
export declare function utf8DecodeTag(tag: Tag): {
    name: string | undefined;
    value: string | undefined;
};
export declare function hash(data: Uint8Array, algorithm?: string): Promise<Uint8Array>;
export declare function bufferTob64(buffer: Uint8Array): string;
export declare function bufferTob64Url(buffer: Uint8Array): string;
export declare function b64UrlEncode(b64UrlString: string): string;
export declare const parseB64UrlOrThrow: (b64urlString: string, fieldName: string) => Buffer;
export declare function sha256Hex(data: string): string;
export declare function cryptoHash(data: Uint8Array, algorithm?: string): Promise<Uint8Array>;
export declare function stringToBuffer(str: string): Buffer;
export declare function deepHash(data: DeepHashChunk): Promise<Uint8Array>;
export declare function deepHashChunks(chunks: DeepHashChunks, acc: Uint8Array): Promise<Uint8Array>;
