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
Object.defineProperty(exports, "__esModule", { value: true });
exports.mineWithFailsRoute = exports.mineRoute = void 0;
const block_1 = require("../db/block");
const transaction_1 = require("../db/transaction");
const utils_1 = require("../utils/utils");
const chunks_1 = require("../db/chunks");
const data_1 = require("../db/data");
const encoding_1 = require("../utils/encoding");
const arbundles_1 = require("arbundles");
let blockDB;
let chunkDB;
let dataDB;
let transactionDB;
let connectionSettings;
function mineRoute(ctx) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!blockDB ||
                !chunkDB ||
                !dataDB ||
                connectionSettings !== ctx.connection.client.connectionSettings.filename ||
                !transactionDB) {
                blockDB = new block_1.BlockDB(ctx.connection);
                chunkDB = new chunks_1.ChunkDB(ctx.connection);
                dataDB = new data_1.DataDB(ctx.dbPath);
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            let txs = yield transactionDB.getUnminedTxsRaw();
            const unverifiedBundleTxs = [];
            // unbundle ans-104 bundles that were posted via /chunks
            for (const tx of txs) {
                if (tx.data)
                    continue;
                // implementation of unbundling similar to line 153 of routes/transaction.ts
                // but directly to database
                const createTxsFromItems = (buffer) => __awaiter(this, void 0, void 0, function* () {
                    const bundle = new arbundles_1.Bundle(buffer);
                    const verified = yield bundle.verify();
                    if (!verified)
                        return false;
                    const items = bundle.items;
                    // verify if bundles haven't been unbundled already
                    const ids = items.map((_, i) => bundle.getIdBy(i));
                    const matches = (yield ctx.connection('transactions').whereIn('id', ids).select('id')).map((i) => i.id) || [];
                    for (let i = 0; i < items.length; i++) {
                        const item = items[i];
                        const id = bundle.getIdBy(i);
                        if (matches.includes(id))
                            continue;
                        // build tx body
                        const $tx = Object.assign({ id, bundledIn: tx.id }, item.toJSON());
                        // insert transaction
                        const toPost = (0, transaction_1.formatTransaction)($tx);
                        toPost.created_at = tx.created_at;
                        toPost.height = tx.height;
                        yield ctx.connection.insert(toPost).into('transactions');
                        // insert data
                        yield dataDB.insert({ txid: id, data: $tx.data });
                        // insert tags
                        let index = 0;
                        for (const tag of $tx.tags) {
                            const name = utils_1.Utils.atob(tag.name);
                            const value = utils_1.Utils.atob(tag.value);
                            ctx.logging.log(name, value);
                            yield ctx.connection
                                .insert({
                                index,
                                tx_id: id,
                                name,
                                value,
                            })
                                .into('tags');
                            index++;
                        }
                    }
                    return true;
                });
                let tags = [];
                try {
                    tags = JSON.parse(tx.tags);
                }
                catch (_b) { }
                let bundleFormat = '';
                let bundleVersion = '';
                for (const tag of tags) {
                    const name = utils_1.Utils.atob(tag.name);
                    const value = utils_1.Utils.atob(tag.value);
                    if (name === 'Bundle-Version')
                        bundleVersion = value;
                    if (name === 'Bundle-Format')
                        bundleFormat = value;
                }
                if (bundleFormat === 'binary' && bundleVersion === '2.0.0') {
                    let chunks = (yield chunkDB.getRoot(tx.data_root)) || [];
                    if (chunks.length) {
                        // filter duplicate data chunks
                        const chunksHash = Array.from(new Set(chunks.map((c) => (0, encoding_1.sha256Hex)(c.chunk))));
                        chunks = chunksHash.map((h) => chunks.find((c) => (0, encoding_1.sha256Hex)(c.chunk) === h));
                        chunks.sort((a, b) => a.offset - b.offset);
                        // parse chunk(s) to buffer
                        const chunk = chunks.map((ch) => Buffer.from((0, encoding_1.b64UrlToBuffer)(ch.chunk)));
                        const buffer = Buffer.concat(chunk);
                        const done = yield createTxsFromItems(buffer);
                        if (!done)
                            unverifiedBundleTxs.push(tx.id);
                    }
                }
            }
            const inc = +(((_a = ctx.params) === null || _a === void 0 ? void 0 : _a.qty) || 1);
            txs = yield transactionDB.getUnminedTxs();
            for (let i = 1; i <= inc; i++) {
                let $txs = [];
                if (i === inc) {
                    $txs = txs; // add the transactions to the last block
                }
                ctx.network.current = yield blockDB.mine(ctx.network.blocks, ctx.network.current, $txs);
                ctx.network.height = ctx.network.height + 1;
                ctx.network.blocks = ctx.network.blocks + 1;
            }
            yield transactionDB.mineTxs(ctx.network.current, unverifiedBundleTxs);
            ctx.body = ctx.network;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.mineRoute = mineRoute;
function mineWithFailsRoute(ctx) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!blockDB || connectionSettings !== ctx.connection.client.connectionSettings.filename || !transactionDB) {
                blockDB = new block_1.BlockDB(ctx.connection);
                transactionDB = new transaction_1.TransactionDB(ctx.connection);
                connectionSettings = ctx.connection.client.connectionSettings.filename;
            }
            console.log(`Fails percentage set to ${ctx.fails * 100}%`);
            const txs = [];
            const unminedTxs = yield transactionDB.getUnminedTxs();
            unminedTxs.forEach((tx) => __awaiter(this, void 0, void 0, function* () {
                const fail = Math.random() < ctx.fails;
                if (fail) {
                    yield transactionDB.deleteById(tx);
                }
                else {
                    txs.push(tx);
                }
            }));
            const inc = +(((_a = ctx.params) === null || _a === void 0 ? void 0 : _a.qty) || 1);
            ctx.network.current = yield blockDB.mine(ctx.network.blocks, ctx.network.current, txs);
            ctx.network.height = ctx.network.height + inc;
            ctx.network.blocks = ctx.network.blocks + inc;
            yield transactionDB.mineTxs(ctx.network.current, []);
            ctx.body = ctx.network;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.mineWithFailsRoute = mineWithFailsRoute;
//# sourceMappingURL=mine.js.map