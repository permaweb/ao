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
exports.deleteTxRoute = exports.txDataRoute = exports.txRawDataRoute = exports.txFileRoute = exports.txFieldRoute = exports.txStatusRoute = exports.txPostRoute = exports.txOffsetRoute = exports.txRoute = exports.txAnchorRoute = exports.pathRegex = void 0;
const mime_1 = __importDefault(require("mime"));
const transaction_1 = require("../db/transaction");
const data_1 = require("../db/data");
const utils_1 = require("../utils/utils");
const arbundles_1 = require("arbundles");
const wallet_1 = require("../db/wallet");
const encoding_1 = require("../utils/encoding");
const chunks_1 = require("../db/chunks");
const merkle_1 = require("../utils/merkle");
exports.pathRegex = /^\/?([a-z0-9-_]{43})/i;
let transactionDB;
let dataDB;
let walletDB;
let chunkDB;
let oldDbPath;
let connectionSettings;
const FIELDS = [
    'id',
    'last_tx',
    'owner',
    'tags',
    'target',
    'quantity',
    'data_root',
    'data_size',
    'reward',
    'signature',
];
function txAnchorRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        const txs = yield ctx.connection.select('id').from('blocks').orderBy('created_at', 'desc').limit(1);
        if (txs.length) {
            ctx.body = txs[0].id;
            return;
        }
        ctx.body = '';
    });
}
exports.txAnchorRoute = txAnchorRoute;
function txRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath ||
                !transactionDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const transaction = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(transaction);
            ctx.logging.log(metadata);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not Found' };
                return;
            }
            ctx.status = 200;
            ctx.headers['accept-ranges'] = 'bytes';
            ctx.headers['content-length'] = metadata.data_size;
            ctx.body = metadata;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txRoute = txRoute;
function txOffsetRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath ||
                !transactionDB ||
                !chunkDB ||
                !dataDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                chunkDB = new chunks_1.ChunkDB(ctx.connection);
                dataDB = new data_1.DataDB(ctx.dbPath);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const transaction = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(transaction);
            ctx.logging.log(metadata);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not Found' };
                return;
            }
            const chunk = yield chunkDB.getByRootAndSize(metadata.data_root, +metadata.data_size);
            ctx.status = 200;
            ctx.type = 'text/plain'; // TODO: updated this in arweave gateway to app/json
            ctx.body = { offset: `${+chunk.offset + +metadata.data_size - 1}`, size: `${metadata.data_size}` };
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txOffsetRoute = txOffsetRoute;
function txPostRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !dataDB || !walletDB) {
                dataDB = new data_1.DataDB(ctx.dbPath);
                walletDB = new wallet_1.WalletDB(ctx.connection);
                chunkDB = new chunks_1.ChunkDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const data = ctx.request.body;
            const owner = (0, encoding_1.bufferTob64Url)(yield (0, encoding_1.hash)((0, encoding_1.b64UrlToBuffer)(data.owner)));
            const wallet = yield walletDB.getWallet(owner);
            const calculatedReward = Math.round((+(data.data_size || '0') / 1000) * 65595508);
            if (!wallet || wallet.balance < calculatedReward) {
                ctx.status = 410;
                ctx.body = { code: 410, msg: "You don't have enough tokens" };
                return;
            }
            ctx.logging.log('post', data);
            let bundleFormat = '';
            let bundleVersion = '';
            for (const tag of data.tags) {
                const name = utils_1.Utils.atob(tag.name);
                const value = utils_1.Utils.atob(tag.value);
                if (name === 'Bundle-Format')
                    bundleFormat = value;
                if (name === 'Bundle-Version')
                    bundleVersion = value;
            }
            if (bundleFormat === 'binary' && bundleVersion === '2.0.0') {
                // ANS-104
                const createTxsFromItems = (buffer) => __awaiter(this, void 0, void 0, function* () {
                    const bundle = new arbundles_1.Bundle(buffer);
                    const items = bundle.items;
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        yield txPostRoute(Object.assign(Object.assign({}, ctx), { connection: ctx.connection, dbPath: ctx.dbPath, logging: ctx.logging, network: ctx.network, request: Object.assign(Object.assign({}, ctx.request), { body: Object.assign({ id: bundle.getIdBy(i), bundledIn: data.id }, item.toJSON()) }), txInBundle: true }));
                    }
                });
                if (data.data) {
                    const buffer = Buffer.from(data.data, 'base64');
                    yield createTxsFromItems(buffer);
                }
                else {
                    (() => __awaiter(this, void 0, void 0, function* () {
                        var _a, _b;
                        let lastOffset = 0;
                        let chunks;
                        while (+data.data_size !== lastOffset) {
                            chunks = yield chunkDB.getRoot(data.data_root);
                            const firstChunkOffset = +((_a = chunks[0]) === null || _a === void 0 ? void 0 : _a.offset) || 0;
                            const lastChunk = chunks[chunks.length - 1];
                            const lastChunkLength = lastChunk ? (0, encoding_1.b64UrlToBuffer)(lastChunk.chunk).byteLength : 0;
                            lastOffset = +((_b = chunks[chunks.length - 1]) === null || _b === void 0 ? void 0 : _b.offset) - firstChunkOffset + lastChunkLength || 0;
                        }
                        const chunk = chunks.map((ch) => Buffer.from((0, encoding_1.b64UrlToBuffer)(ch.chunk)));
                        const buffer = Buffer.concat(chunk);
                        yield createTxsFromItems(buffer);
                    }))();
                }
            }
            // for tx without chunk
            // create the chunk, to prevent offset error on tx/:offset endpoint
            if (data.data && !ctx.txInBundle) {
                // create tx chunks if not exists
                const chunk = yield chunkDB.getByRootAndSize(data.data_root, +data.data_size);
                if (!chunk) {
                    // get data from data db
                    const dataBuf = (0, encoding_1.b64UrlToBuffer)(data.data);
                    const nChunk = yield (0, merkle_1.generateTransactionChunks)(dataBuf);
                    // make chunks offsets unique
                    const lastOffset = yield chunkDB.getLastChunkOffset();
                    // create all chunks
                    const asyncOps = nChunk.chunks.map((_chunk, idx) => {
                        const proof = nChunk.proofs[idx];
                        return chunkDB.create({
                            chunk: (0, encoding_1.bufferTob64Url)(dataBuf.slice(_chunk.minByteRange, _chunk.maxByteRange)),
                            data_size: +data.data_size,
                            data_path: (0, encoding_1.bufferTob64Url)(proof.proof),
                            data_root: (0, encoding_1.bufferTob64Url)(nChunk.data_root),
                            offset: proof.offset + lastOffset,
                        });
                    });
                    yield Promise.all(asyncOps);
                }
            }
            // BALANCE UPDATES
            if ((data === null || data === void 0 ? void 0 : data.target) && (data === null || data === void 0 ? void 0 : data.quantity)) {
                let targetWallet = yield walletDB.getWallet(data.target);
                if (!targetWallet) {
                    yield walletDB.addWallet({
                        address: data === null || data === void 0 ? void 0 : data.target,
                        balance: 0,
                    });
                    targetWallet = yield walletDB.getWallet(data.target);
                }
                if (!wallet || !targetWallet) {
                    ctx.status = 404;
                    ctx.body = { status: 404, error: `Wallet not found` };
                    return;
                }
                if ((wallet === null || wallet === void 0 ? void 0 : wallet.balance) < +data.quantity + +data.reward) {
                    ctx.status = 403;
                    ctx.body = { status: 403, error: `you don't have enough funds to send ${data.quantity}` };
                    return;
                }
                yield walletDB.incrementBalance(data.target, +data.quantity);
                yield walletDB.decrementBalance(wallet.address, +data.quantity);
            }
            yield dataDB.insert({ txid: data.id, data: data.data });
            const tx = (0, transaction_1.formatTransaction)(data);
            tx.created_at = new Date().toISOString();
            tx.height = ctx.network.blocks;
            yield ctx.connection.insert(tx).into('transactions');
            let index = 0;
            for (const tag of data.tags) {
                const name = utils_1.Utils.atob(tag.name);
                const value = utils_1.Utils.atob(tag.value);
                ctx.logging.log(name, value);
                yield ctx.connection
                    .insert({
                    index,
                    tx_id: tx.id,
                    name,
                    value,
                })
                    .into('tags');
                index++;
            }
            // Don't charge wallet for arbundles Data-Items
            // @ts-ignore
            if (!ctx.txInBundle) {
                const fee = +data.reward > calculatedReward ? +data.reward : calculatedReward;
                yield walletDB.decrementBalance(owner, +fee);
            }
            ctx.body = data;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txPostRoute = txPostRoute;
function txStatusRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath ||
                !transactionDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const transaction = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(transaction);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not Found !' };
                return;
            }
            if (!metadata.block) {
                ctx.body = 'Pending';
                return;
            }
            ctx.body = {
                block_height: metadata.height,
                block_indep_hash: metadata.block,
                number_of_confirmations: ctx.network.height - metadata.height,
            };
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txStatusRoute = txStatusRoute;
function txFieldRoute(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath ||
                !transactionDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const transaction = path.length > 1 ? path[1] : '';
            const field = ctx.params.field;
            if (field.includes('.')) {
                yield next();
                return;
            }
            if (!FIELDS.includes(field)) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Field Not Found !' };
                return;
            }
            const metadata = yield transactionDB.getById(transaction);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not Found !' };
                return;
            }
            if (!metadata.block) {
                ctx.body = 'Pending';
                return;
            }
            ctx.body = metadata[field];
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txFieldRoute = txFieldRoute;
function txFileRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath ||
                !transactionDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const transaction = path.length > 1 ? path[1] : '';
            const file = ctx.params.file;
            const metadata = yield transactionDB.getById(transaction);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not Found !' };
                return;
            }
            if (!metadata.block) {
                ctx.body = 'Pending';
                return;
            }
            ctx.redirect(`http://${ctx.request.header.host}/${transaction}/${file}`);
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.txFileRoute = txFileRoute;
function txRawDataRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!transactionDB ||
                !dataDB ||
                oldDbPath !== ctx.dbPath ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                dataDB = new data_1.DataDB(ctx.dbPath);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const txid = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(txid);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not found' };
                return;
            }
            // Check for the data_size
            const size = parseInt(metadata.data_size, 10);
            if (size > 12000000) {
                ctx.status = 400;
                ctx.body = 'tx_data_too_big';
                return;
            }
            // Find the transaction data
            const data = yield dataDB.findOne(txid);
            // Return the base64 data to the user
            ctx.status = 200;
            ctx.body = data.data;
        }
        catch (error) {
            ctx.status = 500;
            ctx.body = { error: error.message };
        }
    });
}
exports.txRawDataRoute = txRawDataRoute;
function txDataRoute(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!transactionDB ||
                !dataDB ||
                oldDbPath !== ctx.dbPath ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                dataDB = new data_1.DataDB(ctx.dbPath);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const txid = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(txid);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not found' };
                return;
            }
            const ext = ctx.params.ext;
            const contentType = mime_1.default.getType(ext);
            // Find the transaction data
            const data = yield dataDB.findOne(txid);
            if (!data || !data.data) {
                // move to next controller
                return yield next();
            }
            // parse raw data to manifest
            const parsedData = utils_1.Utils.atob(data.data);
            ctx.header['content-type'] = contentType;
            ctx.status = 200;
            ctx.body = parsedData;
        }
        catch (error) {
            ctx.status = 500;
            ctx.body = { error: error.message };
        }
    });
}
exports.txDataRoute = txDataRoute;
function deleteTxRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!transactionDB ||
                !dataDB ||
                oldDbPath !== ctx.dbPath ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename) {
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                dataDB = new data_1.DataDB(ctx.dbPath);
                oldDbPath = ctx.dbPath;
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            const path = ctx.params.txid.match(exports.pathRegex) || [];
            const txid = path.length > 1 ? path[1] : '';
            const metadata = yield transactionDB.getById(txid);
            if (!metadata) {
                ctx.status = 404;
                ctx.body = { status: 404, error: 'Not found' };
                return;
            }
            yield transactionDB.deleteById(txid);
            ctx.status = 200;
            return;
        }
        catch (error) {
            ctx.status = 500;
            ctx.body = { error: error.message };
        }
    });
}
exports.deleteTxRoute = deleteTxRoute;
//# sourceMappingURL=transaction.js.map