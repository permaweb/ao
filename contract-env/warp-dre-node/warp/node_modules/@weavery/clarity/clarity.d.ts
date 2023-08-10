declare type bool = boolean;
declare type buff = Uint8Array;
declare type expr<T> = () => T;
declare type int = number;
declare type list<E> = Array<E>;
declare type optional<T> = T | typeof none;
declare type principal = string;
declare type err<T> = Err<T>;
declare type response<T, E> = T | err<E>;
declare type trait = string;
declare type tuple = Map<String, any>;
declare type uint = number;
interface Seq {
    length: uint;
}
export declare var SmartWeave: any;
export declare class Panic<T> extends Error {
    constructor(message: string);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#clarity-type-system
 */
export declare class Err<T> extends Error {
    value: T;
    constructor(value: T);
}
export declare function requireVersion(version: string): void;
export declare function requireFeature(feature: string): void;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-add
 */
export declare function add(...args: int[] | uint[]): int | uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#--subtract
 */
export declare function sub(...args: int[] | uint[]): int | uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-multiply
 */
export declare function mul(...args: int[] | uint[]): int | uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-divide
 */
export declare function div(...args: int[] | uint[]): int | uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-less-than
 */
export declare function lt<T>(a: T, b: T): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-less-than-or-equal
 */
export declare function le<T>(a: T, b: T): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-greater-than
 */
export declare function gt<T>(a: T, b: T): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-greater-than-or-equal
 */
export declare function ge<T>(a: T, b: T): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#append
 */
export declare function append<T>(list: list<T>, value: T): list<T>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#as-contract
 */
export declare function asContract<A>(expr: expr<A>): A;
/**
 * @link https://docs.blockstack.org/references/language-clarity#as-max-len
 */
export declare function asMaxLen<T extends Seq>(value: T, length: uint): optional<T>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#at-block
 */
export declare function atBlock<A>(blockHash: buff, expr: expr<A>): A;
/**
 * @link https://docs.blockstack.org/references/language-clarity#block-height
 */
export declare function blockHeight(): uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#concat
 */
export declare function concat<T>(a: list<T> | buff, b: list<T> | buff): list<T> | buff;
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-call
 */
export declare function contractCall<A, B>(contractName: trait, functionName: string, ...args: any): response<A, B>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-caller
 */
export declare function contractCaller(): principal;
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-of
 */
export declare function contractOf(contractName: trait): principal;
/**
 * @link https://docs.blockstack.org/references/language-clarity#default-to
 */
export declare function defaultTo<T>(defaultValue: T, optionValue: optional<T>): T;
/**
 * @link https://docs.blockstack.org/references/language-clarity#err
 */
export declare function err<T>(value: T): Err<T>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#filter
 */
export declare function filter<A>(func: (a: A) => bool, list: list<A>): list<A>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#fold
 */
export declare function fold<A, B>(func: (a: A, b: B) => B, list: list<A>, initialValue: B): B;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-get-balance
 */
export declare function ftGetBalance(tokenName: string, principal: principal): uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-mint
 */
export declare function ftMint(tokenName: string, amount: uint, recipient: principal): response<bool, uint>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-transfer
 */
export declare function ftTransfer(tokenName: string, amount: uint, sender: principal, recipient: principal): response<bool, uint>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#get
 */
export declare function get<T>(keyName: string, tuple: tuple | optional<tuple>): T | optional<T>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#get-block-info
 */
export declare function getBlockInfo(propName: string, blockHeight: uint): optional<buff> | optional<uint>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#hash160
 */
export declare function hash160(value: buff | uint | int): buff;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-eq
 */
export declare function isEq(...values: any[]): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-err
 */
export declare function isErr(value: any): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-none
 */
export declare function isNone(value: any): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-ok
 */
export declare function isOk(value: any): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-some
 */
export declare function isSome(value: any): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#keccak256
 */
export declare function keccak256(value: buff | uint | int): buff;
/**
 * @link https://docs.blockstack.org/references/language-clarity#len
 */
export declare function len<T>(value: list<T> | buff | string): uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#list
 */
export declare function list<T>(...values: T[]): T[];
/**
 * @link https://docs.blockstack.org/references/language-clarity#map
 */
export declare function map<A, B>(func: (a: A) => B, list: list<A>): list<B>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-delete
 */
export declare function mapDelete(map: Map<tuple, tuple>, key: tuple): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-get
 */
export declare function mapGet(map: Map<tuple, tuple>, key: tuple): optional<tuple>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-insert
 */
export declare function mapInsert(map: Map<tuple, tuple>, key: tuple, value: tuple): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-set
 */
export declare function mapSet(map: Map<tuple, tuple>, key: tuple, value: tuple): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#match
 */
export declare function match<T, E>(input: optional<T> | response<T, E>, okBranch: (_: T) => any, errBranch: (_: E) => any): any;
/**
 * @link https://docs.blockstack.org/references/language-clarity#mod
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 */
export declare function mod(a: int | uint, b: int | uint): int | uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-get-owner
 */
export declare function nftGetOwner(assetClass: string, assetID: string): optional<principal>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-mint
 */
export declare function nftMint(assetClass: string, assetID: string, recipient: principal): response<bool, uint>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-transfer
 */
export declare function nftTransfer(assetClass: string, assetID: string, sender: principal, recipient: principal): response<bool, uint>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#none
 */
export declare const none: any;
/**
 * @link https://docs.blockstack.org/references/language-clarity#not
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_NOT
 */
export declare function not(value: bool): bool;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ok
 */
export declare function ok<T, E>(value: T): response<T, E>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#pow
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation
 */
export declare function pow(a: int | uint, b: int | uint): int | uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#print
 */
export declare function print<T>(value: T): T;
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha256
 */
export declare function sha256(value: buff | uint | int): buff;
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha512
 */
export declare function sha512(value: buff | uint | int): buff;
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha512256
 */
export declare function sha512_256(value: buff | uint | int): buff;
/**
 * @link https://docs.blockstack.org/references/language-clarity#some
 */
export declare function some<T>(value: T): optional<T>;
/**
 * @link https://docs.blockstack.org/references/language-clarity#to-int
 */
export declare function toInt(value: uint): int;
/**
 * @link https://docs.blockstack.org/references/language-clarity#to-uint
 */
export declare function toUint(value: int): uint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#try
 */
export declare function tryUnwrap<A, B>(optionInput: optional<A> | response<A, B>): A | B | null;
/**
 * @link https://docs.blockstack.org/references/language-clarity#tuple
 */
export declare function tuple(...pairs: Array<any>[]): tuple;
/**
 * @link https://docs.blockstack.org/references/language-clarity#tx-sender
 */
export declare function txSender(): principal;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap
 */
export declare function unwrap<A, B>(optionInput: optional<A> | response<A, B>, thrownValue: A): A;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-err
 */
export declare function unwrapErr<A, B>(responseInput: response<A, B>, thrownValue: B): B;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-err-panic
 */
export declare function unwrapErrPanic<A, B>(responseInput: response<A, B>): B;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-panic
 */
export declare function unwrapPanic<A, B>(optionInput: optional<A> | response<A, B>): A;
/**
 * @link https://docs.blockstack.org/references/language-clarity#xor
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR
 */
export declare function xor(a: int | uint, b: int | uint): int | uint;
export {};
