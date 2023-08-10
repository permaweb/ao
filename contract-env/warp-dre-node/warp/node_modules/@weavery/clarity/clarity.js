/* This is free and unencumbered software released into the public domain. */
function hash(algorithm, value) {
    if (Number.isInteger(value)) {
        let buff = new Uint8Array(16); // 128 bits
        let view = new DataView(buff.buffer);
        view.setBigUint64(0, BigInt(value), true);
        value = buff;
    }
    if (value instanceof Uint8Array) {
        let buffer = null;
        switch (algorithm) {
            case 'keccak256':
                throw new Error("not implemented yet"); // TODO
            default:
                throw new Error("not implemented yet"); // TODO
            //buffer = crypto.createHash(algorithm).update(value).digest()
        }
        return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    }
    throw new TypeError();
}
const txSenderStack = [];
export var SmartWeave = null;
export class Panic extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, Panic.prototype);
    }
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#clarity-type-system
 */
export class Err extends Error {
    constructor(value) {
        super(""); // TODO
        this.value = value;
        Object.setPrototypeOf(this, Err.prototype);
    }
}
export function requireVersion(version) {
    // TODO: throw an error if the version isn't supported
}
export function requireFeature(feature) {
    // TODO: throw an error if the feature isn't supported
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-add
 */
export function add(...args) {
    return args.reduce((sum, operand) => sum + operand, 0);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#--subtract
 */
export function sub(...args) {
    return args.slice(1).reduce((difference, operand) => difference - operand, args[0]);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-multiply
 */
export function mul(...args) {
    return args.reduce((product, operand) => product * operand, 1);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-divide
 */
export function div(...args) {
    return Math.trunc(args.slice(1).reduce((quotient, operand) => quotient / operand, args[0]));
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-less-than
 */
export function lt(a, b) {
    return a < b;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-less-than-or-equal
 */
export function le(a, b) {
    return a <= b;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-greater-than
 */
export function gt(a, b) {
    return a > b;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#-greater-than-or-equal
 */
export function ge(a, b) {
    return a >= b;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#append
 */
export function append(list, value) {
    return [...list, value];
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#as-contract
 */
export function asContract(expr) {
    if (SmartWeave) {
        try {
            txSenderStack.unshift(SmartWeave.contract.id);
            return expr();
        }
        finally {
            txSenderStack.shift();
        }
    }
    throw new Error("as-contract not supported");
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#as-max-len
 */
export function asMaxLen(value, length) {
    return value.length <= length ? some(value) : none;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#at-block
 */
export function atBlock(blockHash, expr) {
    if (SmartWeave) {
        throw new Error("at-block not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#block-height
 */
export function blockHeight() {
    if (SmartWeave) {
        return SmartWeave.block.height;
    }
    throw new Error("block-height not supported");
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#concat
 */
export function concat(a, b) {
    if (a instanceof Array && b instanceof Array) {
        return [].concat(a, b);
    }
    if (a instanceof Uint8Array && b instanceof Uint8Array) {
        const result = new Uint8Array(a.byteLength + b.byteLength);
        result.set(a, 0);
        result.set(b, a.byteLength);
        return result;
    }
    throw new TypeError();
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-call
 */
export function contractCall(contractName, functionName, ...args) {
    if (SmartWeave) {
        throw new Error("contract-call? not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-caller
 */
export function contractCaller() {
    if (SmartWeave) {
        return txSender();
    }
    throw new Error("contract-caller not supported");
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-of
 */
export function contractOf(contractName) {
    if (SmartWeave) {
        throw new Error("contract-of not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#default-to
 */
export function defaultTo(defaultValue, optionValue) {
    return optionValue !== null && optionValue !== void 0 ? optionValue : defaultValue;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#err
 */
export function err(value) {
    return new Err(value);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#filter
 */
export function filter(func, list) {
    if (list instanceof Array) {
        return list.filter(func);
    }
    throw new TypeError();
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#fold
 */
export function fold(func, list, initialValue) {
    if (list instanceof Array) {
        return list.reduce((accumulator, currentValue) => func(currentValue, accumulator), initialValue);
    }
    throw new TypeError();
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-get-balance
 */
export function ftGetBalance(tokenName, principal) {
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-mint
 */
export function ftMint(tokenName, amount, recipient) {
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-transfer
 */
export function ftTransfer(tokenName, amount, sender, recipient) {
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#get
 */
export function get(keyName, tuple) {
    return isNone(tuple) ? none : tuple.get(keyName);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#get-block-info
 */
export function getBlockInfo(propName, blockHeight) {
    if (SmartWeave) {
        throw new Error("get-block-info? not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#hash160
 */
export function hash160(value) {
    if (Number.isInteger(value)) {
        let buff = new Uint8Array(16); // 128 bits
        let view = new DataView(buff.buffer);
        view.setBigUint64(0, BigInt(value), true);
        value = buff;
    }
    if (value instanceof Uint8Array) {
        throw new Error("not implemented yet"); // TODO
        //const sha256 = crypto.createHash('sha256').update(value).digest()
        //const buffer = crypto.createHash('ripemd160').update(sha256).digest()
        //return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength)
    }
    throw new TypeError();
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-eq
 */
export function isEq(...values) {
    if (values.length > 0 && values.every((value) => typeof value === typeof values[0])) {
        return values.every((value) => value === values[0]);
    }
    throw new TypeError();
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-err
 */
export function isErr(value) {
    return value instanceof Err;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-none
 */
export function isNone(value) {
    return value === none;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-ok
 */
export function isOk(value) {
    return !(value instanceof Err);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-some
 */
export function isSome(value) {
    return value !== none;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#keccak256
 */
export function keccak256(value) {
    return hash('keccak256', value);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#len
 */
export function len(value) {
    return value.length;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#list
 */
export function list(...values) {
    if (values.length > 0 && values.some((value) => typeof value !== typeof values[0])) {
        throw new TypeError();
    }
    return values;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#map
 */
export function map(func, list) {
    if (list instanceof Array) {
        return list.map(func);
    }
    throw new TypeError();
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-delete
 */
export function mapDelete(map, key) {
    return map.delete(key);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-get
 */
export function mapGet(map, key) {
    const value = map.get(key);
    return value ? some(value) : none;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-insert
 */
export function mapInsert(map, key, value) {
    if (map.has(key))
        return false;
    map.set(key, value);
    return true;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-set
 */
export function mapSet(map, key, value) {
    map.set(key, value);
    return true;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#match
 */
export function match(input, okBranch, errBranch) {
    if (isNone(input) || isErr(input)) {
        return errBranch(input);
    }
    return okBranch(input);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#mod
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 */
export function mod(a, b) {
    if (b === 0) {
        throw new RangeError("division by zero");
    }
    return a % b;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-get-owner
 */
export function nftGetOwner(assetClass, assetID) {
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-mint
 */
export function nftMint(assetClass, assetID, recipient) {
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-transfer
 */
export function nftTransfer(assetClass, assetID, sender, recipient) {
    throw new Error("not implemented yet"); // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#none
 */
export const none = null;
/**
 * @link https://docs.blockstack.org/references/language-clarity#not
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_NOT
 */
export function not(value) {
    return !value;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#ok
 */
export function ok(value) {
    return value;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#pow
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation
 */
export function pow(a, b) {
    return Math.pow(a, b); // TODO: handle overflow
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#print
 */
export function print(value) {
    console.log(value);
    return value;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha256
 */
export function sha256(value) {
    return hash('sha256', value);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha512
 */
export function sha512(value) {
    return hash('sha512', value);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha512256
 */
export function sha512_256(value) {
    return hash('sha512-256', value);
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#some
 */
export function some(value) {
    return value;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#to-int
 */
export function toInt(value) {
    return value; // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#to-uint
 */
export function toUint(value) {
    return value; // TODO
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#try
 */
export function tryUnwrap(optionInput) {
    if (isSome(optionInput) || isOk(optionInput)) {
        return optionInput;
    }
    if (isErr(optionInput)) {
        return optionInput.value; // TODO: local exit
    }
    return none; // TODO: local exit
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#tuple
 */
export function tuple(...pairs) {
    return pairs.reduce((tuple, [k, v]) => tuple.set(k, v), new Map());
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#tx-sender
 */
export function txSender() {
    if (SmartWeave) {
        if (txSenderStack.length > 0) {
            return txSenderStack[0]; // see asContract()
        }
        return SmartWeave.transaction.owner;
    }
    throw new Error("tx-sender not supported");
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap
 */
export function unwrap(optionInput, thrownValue) {
    if (isNone(optionInput) || isErr(optionInput)) {
        return thrownValue;
    }
    return optionInput; // TODO: local exit
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-err
 */
export function unwrapErr(responseInput, thrownValue) {
    if (isErr(responseInput)) {
        return responseInput.value;
    }
    return thrownValue; // TODO: local exit
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-err-panic
 */
export function unwrapErrPanic(responseInput) {
    if (isErr(responseInput)) {
        return responseInput.value;
    }
    throw new Panic("unwrapErrPanic");
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-panic
 */
export function unwrapPanic(optionInput) {
    if (isNone(optionInput) || isErr(optionInput)) {
        throw new Panic("unwrapPanic");
    }
    return optionInput;
}
/**
 * @link https://docs.blockstack.org/references/language-clarity#xor
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR
 */
export function xor(a, b) {
    return a ^ b;
}
