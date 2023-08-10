"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deepHashChunks = exports.deepHash = exports.stringToBuffer = exports.cryptoHash = exports.sha256Hex = exports.parseB64UrlOrThrow = exports.b64UrlEncode = exports.bufferTob64Url = exports.bufferTob64 = exports.hash = exports.utf8DecodeTag = exports.bufferToStream = exports.streamDecoderb64url = exports.isValidUTF8 = exports.streamToJson = exports.jsonToBuffer = exports.bufferToJson = exports.streamToString = exports.streamToBuffer = exports.sha256B64Url = exports.toB32 = exports.fromB32 = exports.fromB64Url = exports.toB64url = exports.sha256 = exports.b64UrlDecode = exports.b64UrlToBuffer = exports.Base64DUrlecode = void 0;
const B64js = __importStar(require("base64-js"));
const rfc4648_1 = require("rfc4648");
const crypto_1 = require("crypto");
const stream_1 = require("stream");
// to prevent circular deps
const buffer_1 = require("./buffer");
class Base64DUrlecode extends stream_1.Transform {
    constructor() {
        super({ decodeStrings: false, objectMode: false });
        this.extra = '';
        this.bytesProcessed = 0;
    }
    _transform(chunk, _, cb) {
        const conbinedChunk = this.extra +
            chunk
                .toString('base64')
                .replace(/-/g, '+')
                .replace(/_/g, '/')
                .replace(/(\r\n|\n|\r)/gm, '');
        this.bytesProcessed += chunk.byteLength;
        const remaining = chunk.length % 4;
        this.extra = conbinedChunk.slice(chunk.length - remaining);
        const buf = Buffer.from(conbinedChunk.slice(0, chunk.length - remaining), 'base64');
        this.push(buf);
        cb();
    }
    _flush(cb) {
        if (this.extra.length) {
            this.push(Buffer.from(this.extra, 'base64'));
        }
        cb();
    }
}
exports.Base64DUrlecode = Base64DUrlecode;
function b64UrlToBuffer(b64UrlString) {
    return new Uint8Array(B64js.toByteArray(b64UrlDecode(b64UrlString)));
}
exports.b64UrlToBuffer = b64UrlToBuffer;
function b64UrlDecode(b64UrlString) {
    b64UrlString = b64UrlString.replace(/\-/g, '+').replace(/\_/g, '/');
    let padding;
    b64UrlString.length % 4 === 0 ? (padding = 0) : (padding = 4 - (b64UrlString.length % 4));
    return b64UrlString.concat('='.repeat(padding));
}
exports.b64UrlDecode = b64UrlDecode;
function sha256(buffer) {
    return (0, crypto_1.createHash)('sha256').update(buffer).digest();
}
exports.sha256 = sha256;
function toB64url(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
exports.toB64url = toB64url;
function fromB64Url(input) {
    const paddingLength = input.length % 4 === 0 ? 0 : 4 - (input.length % 4);
    const base64 = input.replace(/-/g, '+').replace(/_/g, '/').concat('='.repeat(paddingLength));
    return Buffer.from(base64, 'base64');
}
exports.fromB64Url = fromB64Url;
function fromB32(input) {
    return Buffer.from(rfc4648_1.base32.parse(input, {
        loose: true,
    }));
}
exports.fromB32 = fromB32;
function toB32(input) {
    return rfc4648_1.base32.stringify(input, { pad: false }).toLowerCase();
}
exports.toB32 = toB32;
function sha256B64Url(input) {
    return toB64url((0, crypto_1.createHash)('sha256').update(input).digest());
}
exports.sha256B64Url = sha256B64Url;
function streamToBuffer(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        let buffer = Buffer.alloc(0);
        return new Promise((resolve) => {
            stream.on('data', (chunk) => {
                buffer = Buffer.concat([buffer, chunk]);
            });
            stream.on('end', () => {
                resolve(buffer);
            });
        });
    });
}
exports.streamToBuffer = streamToBuffer;
function streamToString(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        return (yield streamToBuffer(stream)).toString('utf-8');
    });
}
exports.streamToString = streamToString;
function bufferToJson(input) {
    return JSON.parse(input.toString('utf8'));
}
exports.bufferToJson = bufferToJson;
function jsonToBuffer(input) {
    return Buffer.from(JSON.stringify(input));
}
exports.jsonToBuffer = jsonToBuffer;
function streamToJson(input) {
    return __awaiter(this, void 0, void 0, function* () {
        return bufferToJson(yield streamToBuffer(input));
    });
}
exports.streamToJson = streamToJson;
function isValidUTF8(buffer) {
    return Buffer.compare(Buffer.from(buffer.toString(), 'utf8'), buffer) === 0;
}
exports.isValidUTF8 = isValidUTF8;
function streamDecoderb64url(readable) {
    const outputStream = new stream_1.PassThrough({ objectMode: false });
    const decoder = new Base64DUrlecode();
    readable.pipe(decoder).pipe(outputStream);
    return outputStream;
}
exports.streamDecoderb64url = streamDecoderb64url;
function bufferToStream(buffer) {
    return new stream_1.Readable({
        objectMode: false,
        read() {
            this.push(buffer);
            this.push(null);
        },
    });
}
exports.bufferToStream = bufferToStream;
function utf8DecodeTag(tag) {
    let name;
    let value;
    try {
        const nameBuffer = fromB64Url(tag.name);
        if (isValidUTF8(nameBuffer)) {
            name = nameBuffer.toString('utf8');
        }
        const valueBuffer = fromB64Url(tag.value);
        if (isValidUTF8(valueBuffer)) {
            value = valueBuffer.toString('utf8');
        }
    }
    catch (error) { }
    return {
        name,
        value,
    };
}
exports.utf8DecodeTag = utf8DecodeTag;
function hash(data, algorithm = 'SHA-256') {
    return __awaiter(this, void 0, void 0, function* () {
        return (0, crypto_1.createHash)(parseHashAlgorithm(algorithm)).update(data).digest();
    });
}
exports.hash = hash;
function bufferTob64(buffer) {
    return B64js.fromByteArray(buffer);
}
exports.bufferTob64 = bufferTob64;
function bufferTob64Url(buffer) {
    return b64UrlEncode(bufferTob64(buffer));
}
exports.bufferTob64Url = bufferTob64Url;
function b64UrlEncode(b64UrlString) {
    return b64UrlString.replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');
}
exports.b64UrlEncode = b64UrlEncode;
function parseHashAlgorithm(algorithm) {
    switch (algorithm) {
        case 'SHA-256':
            return 'sha256';
        case 'SHA-384':
            return 'sha384';
        default:
            throw new Error(`Algorithm not supported: ${algorithm}`);
    }
}
const parseB64UrlOrThrow = (b64urlString, fieldName) => {
    try {
        return fromB64Url(b64urlString);
    }
    catch (error) {
        throw new Error(`missing field: ${fieldName}`);
    }
};
exports.parseB64UrlOrThrow = parseB64UrlOrThrow;
function sha256Hex(data) {
    return (0, crypto_1.createHash)('sha256').update(data).digest('hex');
}
exports.sha256Hex = sha256Hex;
function cryptoHash(data, algorithm = 'SHA-256') {
    return new Promise((resolve, _) => {
        resolve((0, crypto_1.createHash)(parseHashAlgorithm(algorithm)).update(data).digest());
    });
}
exports.cryptoHash = cryptoHash;
function stringToBuffer(str) {
    return Buffer.from(str, 'utf-8');
}
exports.stringToBuffer = stringToBuffer;
function deepHash(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (Array.isArray(data)) {
            const $tag = (0, buffer_1.concatBuffers)([stringToBuffer('list'), stringToBuffer(data.length.toString())]);
            return yield deepHashChunks(data, yield hash($tag, 'SHA-384'));
        }
        const tag = (0, buffer_1.concatBuffers)([stringToBuffer('blob'), stringToBuffer(data.byteLength.toString())]);
        const taggedHash = (0, buffer_1.concatBuffers)([yield hash(tag, 'SHA-384'), yield hash(data, 'SHA-384')]);
        return yield hash(taggedHash, 'SHA-384');
    });
}
exports.deepHash = deepHash;
function deepHashChunks(chunks, acc) {
    return __awaiter(this, void 0, void 0, function* () {
        if (chunks.length < 1) {
            return acc;
        }
        const hashPair = (0, buffer_1.concatBuffers)([acc, yield deepHash(chunks[0])]);
        const newAcc = yield hash(hashPair, 'SHA-384');
        return yield deepHashChunks(chunks.slice(1), newAcc);
    });
}
exports.deepHashChunks = deepHashChunks;
//# sourceMappingURL=encoding.js.map