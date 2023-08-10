"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.txValidateMiddleware = exports.txAccessMiddleware = void 0;
const bytes_1 = __importDefault(require("bytes"));
const encoding_1 = require("../utils/encoding");
const transaction_1 = require("../db/transaction");
const merkle_1 = require("../utils/merkle");
const utils_1 = require("../utils/utils");
const key_1 = require("../utils/key");
const pathRegex = /^\/?([a-z0-9-_]{43})/i;
const txIDRegex = /[a-z0-9-_]{43}/i;
let transactionDB;
let oldDbPath;
let connectionSettings;
function txAccessMiddleware(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath ||
                !transactionDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const rough = ctx.request.url.split('/tx')[1];
            const path = rough.match(pathRegex) || [];
            const txid = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(txid);
            ctx.logging.log(metadata);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = 'Not Found';
                return;
            }
            // restrict tx in a bundle
            if ((metadata.bundledIn || '').length) {
                ctx.status = 404;
                ctx.body = 'Not Found';
                return;
            }
            yield next();
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txAccessMiddleware = txAccessMiddleware;
function txValidateMiddleware(ctx, next) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { body = {} } = ctx.request;
            const requiredFields = ['format', 'id', 'last_tx', 'owner', 'reward', 'signature'];
            // closure so as to access
            // ctx (i.e &ctx)
            // not copy
            function badRequest() {
                ctx.status = 400;
                ctx.headers['content-type'] = 'text/html';
                ctx.body = 'Bad Request';
            }
            for (const field of requiredFields) {
                if (body[field] === undefined) {
                    // log error to console for debugging
                    console.error({
                        error: 'Validation Error',
                        validationErrors: requiredFields.filter((f) => !body[f]).map((f) => `"${f}" is a required field`),
                    });
                    // return arweave.net type error to user
                    badRequest();
                    return;
                }
            }
            /**
             * manually check each field validation
             * based on docs.arweave.org
             */
            const validationErrors = [];
            // format validation
            if (![1, 2, '1', '2'].includes(body.format)) {
                validationErrors.push(`"format" should be one of [1, 2]`);
            }
            // id validation
            if (!txIDRegex.test(body.id)) {
                validationErrors.push(`"id" should match regex: /[a-z0-9-_]{43}/i`);
            }
            // validate id is sha256 hash of signature
            if ((0, encoding_1.sha256B64Url)((0, encoding_1.b64UrlToBuffer)(body.signature)) !== body.id) {
                validationErrors.push(`"id" is invalid, does not represent sha256 hash of transaction signature`);
            }
            // last_tx validation
            if (body.last_tx !== '') {
                let allowed = [''];
                // check if it's a valid block hash or last tx from wallet address
                const last50Blocks = yield ctx.connection.select('id').from('blocks').orderBy('created_at', 'desc').limit(50);
                allowed = [...allowed, ...last50Blocks.map((blk) => blk.id)];
                // check if it's the last tx from the wallet address
                const [ownerLastTx = null] = (yield ctx.connection
                    .select('id')
                    .from('transactions')
                    .where('owner', body.owner)
                    .orderBy('created_at', 'desc')
                    .limit(1)) || [];
                if (ownerLastTx) {
                    allowed.push(ownerLastTx.id);
                }
                if (!allowed.includes(body.last_tx)) {
                    validationErrors.push(`"last_tx" is invalid, should be "", indep_hash one of last 50 blocks` +
                        `or last transaction of owner address. It is always taken from the /tx_anchor endpoint.`);
                }
            }
            // reward validation
            if (isNaN(parseInt(body.reward, 10))) {
                validationErrors.push(`"reward" is invalid, should be numeric string (in winstons)`);
            }
            // signature validation
            let $sign;
            switch (parseInt(body.format, 10)) {
                case 1:
                    const tags = body.tags.reduce((accumulator, tag) => {
                        return (0, utils_1.concatBuffers)([accumulator, (0, encoding_1.b64UrlToBuffer)(tag.name), (0, encoding_1.b64UrlToBuffer)(tag.value)]);
                    }, new Uint8Array());
                    $sign = (0, utils_1.concatBuffers)([
                        (0, encoding_1.b64UrlToBuffer)(body.owner),
                        (0, encoding_1.b64UrlToBuffer)(body.target),
                        (0, encoding_1.b64UrlToBuffer)(body.data),
                        (0, encoding_1.stringToBuffer)(body.quantity),
                        (0, encoding_1.stringToBuffer)(body.reward),
                        (0, encoding_1.b64UrlToBuffer)(body.last_tx),
                        tags,
                    ]);
                    break;
                case 2:
                    const tagList = body.tags.map((tag) => [
                        (0, encoding_1.b64UrlToBuffer)(tag.name),
                        (0, encoding_1.b64UrlToBuffer)(tag.value),
                    ]);
                    $sign = yield (0, encoding_1.deepHash)([
                        (0, encoding_1.stringToBuffer)(body.format.toString()),
                        (0, encoding_1.b64UrlToBuffer)(body.owner),
                        (0, encoding_1.b64UrlToBuffer)(body.target),
                        (0, encoding_1.stringToBuffer)(body.quantity),
                        (0, encoding_1.stringToBuffer)(body.reward),
                        (0, encoding_1.b64UrlToBuffer)(body.last_tx),
                        tagList,
                        (0, encoding_1.stringToBuffer)(body.data_size),
                        (0, encoding_1.b64UrlToBuffer)(body.data_root),
                    ]);
                    break;
                default:
                    validationErrors.push(`"format" should be one of [1, 2]`);
            }
            // verify public key signature with private key generated signature
            if ((yield (0, key_1.verifySignature)(body.owner, $sign, (0, encoding_1.b64UrlToBuffer)(body.signature))) !== true) {
                validationErrors.push(`transaction "signature" is invalid`);
            }
            // tags validation
            if (!Array.isArray(body.tags)) {
                validationErrors.push(`"tags" should be an array`);
            }
            else {
                // verify all items in tags
                for (let i = 0; i < body.tags.length; i++) {
                    if (!((_a = body.tags[i]) === null || _a === void 0 ? void 0 : _a.name)) {
                        validationErrors.push(`"tags[${i}]" expected to have name, but found none`);
                    }
                    if (!((_b = body.tags[i]) === null || _b === void 0 ? void 0 : _b.value)) {
                        validationErrors.push(`"tags[${i}]" expected to have value, but found none`);
                    }
                }
            }
            // target validation
            if (body.target) {
                if (!txIDRegex.test(body.target)) {
                    validationErrors.push(`"target" should match regex: /[a-z0-9-_]{43}/i`);
                }
                if (body.target === (0, encoding_1.sha256B64Url)((0, encoding_1.b64UrlToBuffer)(body.owner))) {
                    validationErrors.push(`"target" cannot be transaction owner address`);
                }
            }
            // quantity validation
            if (body.quantity && isNaN(parseInt(body.quantity, 10))) {
                validationErrors.push(`"quantity" is invalid, should be numeric string (in winstons)`);
            }
            // data_root validation
            if (body.data_root) {
                if (body.data_root !== '') {
                    if (body.data && body.data !== '') {
                        const genRoot = (0, encoding_1.bufferTob64Url)(yield (0, merkle_1.computeRootHash)((0, encoding_1.b64UrlToBuffer)(body.data)));
                        if (genRoot !== body.data_root) {
                            validationErrors.push(`"data_root" is invalid`);
                        }
                    }
                }
                if (body.data_root === '' && (body.data || '') !== '') {
                    validationErrors.push(`"data_root" is invalid, cannot be empty string when "data" exists`);
                }
            }
            // data_size validation
            if (body.data_size) {
                if (isNaN(parseInt(body.data_size, 10))) {
                    validationErrors.push(`"data_size" is invalid, should be size in bytes of transaction data`);
                }
                // verify data_size matches data or comb of all chunks
                if (body.data !== '') {
                    if ((0, encoding_1.fromB64Url)(body.data).byteLength !== parseInt(body.data_size, 10)) {
                        validationErrors.push(`"data_size" is invalid, should match transaction "data" size`);
                    }
                }
                else {
                    let chunks = (yield ctx.connection.select('*').from('chunks').where('data_root', body.data_root)) || [];
                    if (chunks.length) {
                        // filter duplicate data chunks
                        const chunksHash = Array.from(new Set(chunks.map((c) => (0, encoding_1.sha256Hex)(c.chunk))));
                        chunks = chunksHash.map((h) => chunks.find((c) => (0, encoding_1.sha256Hex)(c.chunk) === h));
                        chunks.sort((a, b) => a.offset - b.offset);
                        if ((0, utils_1.concatBuffers)(chunks.map((c) => (0, encoding_1.fromB64Url)(c.chunk))).byteLength !== parseInt(body.data_size, 10)) {
                            validationErrors.push(`"data_size" is invalid, should match transaction chunks combined size`);
                        }
                    }
                }
            }
            // data validation
            if (body.data) {
                if (!body.data_size || !body.data_root) {
                    validationErrors.push(`"data_size" and "data_root" must be present to use "data" field`);
                }
                // verify data string doesn't pass 10/12 mb of data
                switch (parseInt(body.format, 10)) {
                    case 1:
                        if ((0, encoding_1.fromB64Url)(body.data).byteLength > (0, bytes_1.default)('10mb')) {
                            validationErrors.push(`"data" is invalid, In v1 transactions, data cannot be bigger than 10 MiB`);
                        }
                        break;
                    case 2:
                        if ((0, encoding_1.fromB64Url)(body.data).byteLength > (0, bytes_1.default)('12mb')) {
                            validationErrors.push(`"data" is invalid, In v2 transactions, data cannot be bigger than 10 MiB`);
                        }
                        break;
                    default:
                        validationErrors.push(`"format" should be one of [1, 2]`);
                }
            }
            if (validationErrors.length) {
                console.error({
                    error: 'Validation Error',
                    validationErrors,
                });
                badRequest();
                return;
            }
            yield next();
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txValidateMiddleware = txValidateMiddleware;
//# sourceMappingURL=transaction.js.map