"use strict";
/* This is free and unencumbered software released into the public domain. */
Object.defineProperty(exports, "__esModule", { value: true });
exports.xor = exports.unwrapPanic = exports.unwrapErrPanic = exports.unwrapErr = exports.unwrap = exports.txSender = exports.tuple = exports.tryUnwrap = exports.toUint = exports.toInt = exports.some = exports.sha512_256 = exports.sha512 = exports.sha256 = exports.print = exports.pow = exports.ok = exports.not = exports.none = exports.nftTransfer = exports.nftMint = exports.nftGetOwner = exports.mod = exports.match = exports.mapSet = exports.mapInsert = exports.mapGet = exports.mapDelete = exports.map = exports.list = exports.len = exports.keccak256 = exports.isSome = exports.isOk = exports.isNone = exports.isErr = exports.isEq = exports.hash160 = exports.getBlockInfo = exports.get = exports.ftTransfer = exports.ftMint = exports.ftGetBalance = exports.fold = exports.filter = exports.err = exports.defaultTo = exports.contractOf = exports.contractCaller = exports.contractCall = exports.concat = exports.blockHeight = exports.atBlock = exports.asMaxLen = exports.asContract = exports.append = exports.ge = exports.gt = exports.le = exports.lt = exports.div = exports.mul = exports.sub = exports.add = exports.requireFeature = exports.requireVersion = exports.Err = exports.Panic = exports.SmartWeave = void 0;
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
exports.SmartWeave = null;
class Panic extends Error {
    constructor(message) {
        super(message);
        Object.setPrototypeOf(this, Panic.prototype);
    }
}
exports.Panic = Panic;
/**
 * @link https://docs.blockstack.org/references/language-clarity#clarity-type-system
 */
class Err extends Error {
    constructor(value) {
        super(""); // TODO
        this.value = value;
        Object.setPrototypeOf(this, Err.prototype);
    }
}
exports.Err = Err;
function requireVersion(version) {
    // TODO: throw an error if the version isn't supported
}
exports.requireVersion = requireVersion;
function requireFeature(feature) {
    // TODO: throw an error if the feature isn't supported
}
exports.requireFeature = requireFeature;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-add
 */
function add(...args) {
    return args.reduce((sum, operand) => sum + operand, 0);
}
exports.add = add;
/**
 * @link https://docs.blockstack.org/references/language-clarity#--subtract
 */
function sub(...args) {
    return args.slice(1).reduce((difference, operand) => difference - operand, args[0]);
}
exports.sub = sub;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-multiply
 */
function mul(...args) {
    return args.reduce((product, operand) => product * operand, 1);
}
exports.mul = mul;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-divide
 */
function div(...args) {
    return Math.trunc(args.slice(1).reduce((quotient, operand) => quotient / operand, args[0]));
}
exports.div = div;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-less-than
 */
function lt(a, b) {
    return a < b;
}
exports.lt = lt;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-less-than-or-equal
 */
function le(a, b) {
    return a <= b;
}
exports.le = le;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-greater-than
 */
function gt(a, b) {
    return a > b;
}
exports.gt = gt;
/**
 * @link https://docs.blockstack.org/references/language-clarity#-greater-than-or-equal
 */
function ge(a, b) {
    return a >= b;
}
exports.ge = ge;
/**
 * @link https://docs.blockstack.org/references/language-clarity#append
 */
function append(list, value) {
    return [...list, value];
}
exports.append = append;
/**
 * @link https://docs.blockstack.org/references/language-clarity#as-contract
 */
function asContract(expr) {
    if (exports.SmartWeave) {
        try {
            txSenderStack.unshift(exports.SmartWeave.contract.id);
            return expr();
        }
        finally {
            txSenderStack.shift();
        }
    }
    throw new Error("as-contract not supported");
}
exports.asContract = asContract;
/**
 * @link https://docs.blockstack.org/references/language-clarity#as-max-len
 */
function asMaxLen(value, length) {
    return value.length <= length ? some(value) : exports.none;
}
exports.asMaxLen = asMaxLen;
/**
 * @link https://docs.blockstack.org/references/language-clarity#at-block
 */
function atBlock(blockHash, expr) {
    if (exports.SmartWeave) {
        throw new Error("at-block not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
exports.atBlock = atBlock;
/**
 * @link https://docs.blockstack.org/references/language-clarity#block-height
 */
function blockHeight() {
    if (exports.SmartWeave) {
        return exports.SmartWeave.block.height;
    }
    throw new Error("block-height not supported");
}
exports.blockHeight = blockHeight;
/**
 * @link https://docs.blockstack.org/references/language-clarity#concat
 */
function concat(a, b) {
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
exports.concat = concat;
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-call
 */
function contractCall(contractName, functionName, ...args) {
    if (exports.SmartWeave) {
        throw new Error("contract-call? not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
exports.contractCall = contractCall;
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-caller
 */
function contractCaller() {
    if (exports.SmartWeave) {
        return txSender();
    }
    throw new Error("contract-caller not supported");
}
exports.contractCaller = contractCaller;
/**
 * @link https://docs.blockstack.org/references/language-clarity#contract-of
 */
function contractOf(contractName) {
    if (exports.SmartWeave) {
        throw new Error("contract-of not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
exports.contractOf = contractOf;
/**
 * @link https://docs.blockstack.org/references/language-clarity#default-to
 */
function defaultTo(defaultValue, optionValue) {
    return optionValue !== null && optionValue !== void 0 ? optionValue : defaultValue;
}
exports.defaultTo = defaultTo;
/**
 * @link https://docs.blockstack.org/references/language-clarity#err
 */
function err(value) {
    return new Err(value);
}
exports.err = err;
/**
 * @link https://docs.blockstack.org/references/language-clarity#filter
 */
function filter(func, list) {
    if (list instanceof Array) {
        return list.filter(func);
    }
    throw new TypeError();
}
exports.filter = filter;
/**
 * @link https://docs.blockstack.org/references/language-clarity#fold
 */
function fold(func, list, initialValue) {
    if (list instanceof Array) {
        return list.reduce((accumulator, currentValue) => func(currentValue, accumulator), initialValue);
    }
    throw new TypeError();
}
exports.fold = fold;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-get-balance
 */
function ftGetBalance(tokenName, principal) {
    throw new Error("not implemented yet"); // TODO
}
exports.ftGetBalance = ftGetBalance;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-mint
 */
function ftMint(tokenName, amount, recipient) {
    throw new Error("not implemented yet"); // TODO
}
exports.ftMint = ftMint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ft-transfer
 */
function ftTransfer(tokenName, amount, sender, recipient) {
    throw new Error("not implemented yet"); // TODO
}
exports.ftTransfer = ftTransfer;
/**
 * @link https://docs.blockstack.org/references/language-clarity#get
 */
function get(keyName, tuple) {
    return isNone(tuple) ? exports.none : tuple.get(keyName);
}
exports.get = get;
/**
 * @link https://docs.blockstack.org/references/language-clarity#get-block-info
 */
function getBlockInfo(propName, blockHeight) {
    if (exports.SmartWeave) {
        throw new Error("get-block-info? not supported on SmartWeave");
    }
    throw new Error("not implemented yet"); // TODO
}
exports.getBlockInfo = getBlockInfo;
/**
 * @link https://docs.blockstack.org/references/language-clarity#hash160
 */
function hash160(value) {
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
exports.hash160 = hash160;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-eq
 */
function isEq(...values) {
    if (values.length > 0 && values.every((value) => typeof value === typeof values[0])) {
        return values.every((value) => value === values[0]);
    }
    throw new TypeError();
}
exports.isEq = isEq;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-err
 */
function isErr(value) {
    return value instanceof Err;
}
exports.isErr = isErr;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-none
 */
function isNone(value) {
    return value === exports.none;
}
exports.isNone = isNone;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-ok
 */
function isOk(value) {
    return !(value instanceof Err);
}
exports.isOk = isOk;
/**
 * @link https://docs.blockstack.org/references/language-clarity#is-some
 */
function isSome(value) {
    return value !== exports.none;
}
exports.isSome = isSome;
/**
 * @link https://docs.blockstack.org/references/language-clarity#keccak256
 */
function keccak256(value) {
    return hash('keccak256', value);
}
exports.keccak256 = keccak256;
/**
 * @link https://docs.blockstack.org/references/language-clarity#len
 */
function len(value) {
    return value.length;
}
exports.len = len;
/**
 * @link https://docs.blockstack.org/references/language-clarity#list
 */
function list(...values) {
    if (values.length > 0 && values.some((value) => typeof value !== typeof values[0])) {
        throw new TypeError();
    }
    return values;
}
exports.list = list;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map
 */
function map(func, list) {
    if (list instanceof Array) {
        return list.map(func);
    }
    throw new TypeError();
}
exports.map = map;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-delete
 */
function mapDelete(map, key) {
    return map.delete(key);
}
exports.mapDelete = mapDelete;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-get
 */
function mapGet(map, key) {
    const value = map.get(key);
    return value ? some(value) : exports.none;
}
exports.mapGet = mapGet;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-insert
 */
function mapInsert(map, key, value) {
    if (map.has(key))
        return false;
    map.set(key, value);
    return true;
}
exports.mapInsert = mapInsert;
/**
 * @link https://docs.blockstack.org/references/language-clarity#map-set
 */
function mapSet(map, key, value) {
    map.set(key, value);
    return true;
}
exports.mapSet = mapSet;
/**
 * @link https://docs.blockstack.org/references/language-clarity#match
 */
function match(input, okBranch, errBranch) {
    if (isNone(input) || isErr(input)) {
        return errBranch(input);
    }
    return okBranch(input);
}
exports.match = match;
/**
 * @link https://docs.blockstack.org/references/language-clarity#mod
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Remainder
 */
function mod(a, b) {
    if (b === 0) {
        throw new RangeError("division by zero");
    }
    return a % b;
}
exports.mod = mod;
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-get-owner
 */
function nftGetOwner(assetClass, assetID) {
    throw new Error("not implemented yet"); // TODO
}
exports.nftGetOwner = nftGetOwner;
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-mint
 */
function nftMint(assetClass, assetID, recipient) {
    throw new Error("not implemented yet"); // TODO
}
exports.nftMint = nftMint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#nft-transfer
 */
function nftTransfer(assetClass, assetID, sender, recipient) {
    throw new Error("not implemented yet"); // TODO
}
exports.nftTransfer = nftTransfer;
/**
 * @link https://docs.blockstack.org/references/language-clarity#none
 */
exports.none = null;
/**
 * @link https://docs.blockstack.org/references/language-clarity#not
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_NOT
 */
function not(value) {
    return !value;
}
exports.not = not;
/**
 * @link https://docs.blockstack.org/references/language-clarity#ok
 */
function ok(value) {
    return value;
}
exports.ok = ok;
/**
 * @link https://docs.blockstack.org/references/language-clarity#pow
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Exponentiation
 */
function pow(a, b) {
    return Math.pow(a, b); // TODO: handle overflow
}
exports.pow = pow;
/**
 * @link https://docs.blockstack.org/references/language-clarity#print
 */
function print(value) {
    console.log(value);
    return value;
}
exports.print = print;
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha256
 */
function sha256(value) {
    return hash('sha256', value);
}
exports.sha256 = sha256;
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha512
 */
function sha512(value) {
    return hash('sha512', value);
}
exports.sha512 = sha512;
/**
 * @link https://docs.blockstack.org/references/language-clarity#sha512256
 */
function sha512_256(value) {
    return hash('sha512-256', value);
}
exports.sha512_256 = sha512_256;
/**
 * @link https://docs.blockstack.org/references/language-clarity#some
 */
function some(value) {
    return value;
}
exports.some = some;
/**
 * @link https://docs.blockstack.org/references/language-clarity#to-int
 */
function toInt(value) {
    return value; // TODO
}
exports.toInt = toInt;
/**
 * @link https://docs.blockstack.org/references/language-clarity#to-uint
 */
function toUint(value) {
    return value; // TODO
}
exports.toUint = toUint;
/**
 * @link https://docs.blockstack.org/references/language-clarity#try
 */
function tryUnwrap(optionInput) {
    if (isSome(optionInput) || isOk(optionInput)) {
        return optionInput;
    }
    if (isErr(optionInput)) {
        return optionInput.value; // TODO: local exit
    }
    return exports.none; // TODO: local exit
}
exports.tryUnwrap = tryUnwrap;
/**
 * @link https://docs.blockstack.org/references/language-clarity#tuple
 */
function tuple(...pairs) {
    return pairs.reduce((tuple, [k, v]) => tuple.set(k, v), new Map());
}
exports.tuple = tuple;
/**
 * @link https://docs.blockstack.org/references/language-clarity#tx-sender
 */
function txSender() {
    if (exports.SmartWeave) {
        if (txSenderStack.length > 0) {
            return txSenderStack[0]; // see asContract()
        }
        return exports.SmartWeave.transaction.owner;
    }
    throw new Error("tx-sender not supported");
}
exports.txSender = txSender;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap
 */
function unwrap(optionInput, thrownValue) {
    if (isNone(optionInput) || isErr(optionInput)) {
        return thrownValue;
    }
    return optionInput; // TODO: local exit
}
exports.unwrap = unwrap;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-err
 */
function unwrapErr(responseInput, thrownValue) {
    if (isErr(responseInput)) {
        return responseInput.value;
    }
    return thrownValue; // TODO: local exit
}
exports.unwrapErr = unwrapErr;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-err-panic
 */
function unwrapErrPanic(responseInput) {
    if (isErr(responseInput)) {
        return responseInput.value;
    }
    throw new Panic("unwrapErrPanic");
}
exports.unwrapErrPanic = unwrapErrPanic;
/**
 * @link https://docs.blockstack.org/references/language-clarity#unwrap-panic
 */
function unwrapPanic(optionInput) {
    if (isNone(optionInput) || isErr(optionInput)) {
        throw new Panic("unwrapPanic");
    }
    return optionInput;
}
exports.unwrapPanic = unwrapPanic;
/**
 * @link https://docs.blockstack.org/references/language-clarity#xor
 * @link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_XOR
 */
function xor(a, b) {
    return a ^ b;
}
exports.xor = xor;
