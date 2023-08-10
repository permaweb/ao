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
exports.subDataRoute = exports.dataRoute = exports.dataHeadRoute = exports.pathRegex = exports.dataRouteRegex = void 0;
const url_1 = require("url");
const transaction_1 = require("../db/transaction");
const data_1 = require("../db/data");
const utils_1 = require("../utils/utils");
const encoding_1 = require("../utils/encoding");
const chunks_1 = require("../db/chunks");
exports.dataRouteRegex = /^\/?([a-zA-Z0-9-_]{43})\/?$|^\/?([a-zA-Z0-9-_]{43})\/(.*)$/i;
exports.pathRegex = /^\/?([a-z0-9-_]{43})/i;
let transactionDB;
let dataDB;
let chunkDB;
let oldDbPath;
const decoder = new TextDecoder();
function dataHeadRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!dataDB) {
            dataDB = new data_1.DataDB(ctx.dbPath);
        }
        if (!transactionDB) {
            transactionDB = new transaction_1.TransactionDB(ctx.connection);
        }
        const path = ctx.path.match(exports.pathRegex) || [];
        const transaction = path.length > 1 ? path[1] : '';
        const metadata = yield transactionDB.getById(transaction);
        if (!metadata) {
            ctx.status = 404;
            ctx.body = { status: 404, error: 'Not Found' };
            return;
        }
        ctx.logging.log(metadata);
        ctx.status = 200;
        ctx.headers['accept-ranges'] = 'bytes';
        ctx.headers['content-length'] = metadata.data_size;
    });
}
exports.dataHeadRoute = dataHeadRoute;
function dataRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        if (oldDbPath !== ctx.dbPath || !dataDB || !transactionDB || !chunkDB) {
            dataDB = new data_1.DataDB(ctx.dbPath);
            transactionDB = new transaction_1.TransactionDB(ctx.connection);
            chunkDB = new chunks_1.ChunkDB(ctx.connection);
            oldDbPath = ctx.dbPath;
        }
        const path = ctx.path.match(exports.pathRegex) || [];
        let transaction = path.length > 1 ? path[1] : '';
        let data;
        let metadata = yield transactionDB.getById(transaction);
        if (!metadata) {
            ctx.status = 404;
            ctx.body = { status: 404, error: 'Not Found' };
            return;
        }
        try {
            const contentType = utils_1.Utils.tagValue(metadata.tags, 'Content-Type');
            const bundleFormat = utils_1.Utils.tagValue(metadata.tags, 'Bundle-Format');
            const bundleVersion = utils_1.Utils.tagValue(metadata.tags, 'Bundle-Version');
            if (bundleFormat === 'binary' && bundleVersion === '2.0.0')
                ctx.type = 'application/octet-stream';
            else if (contentType === 'application/x.arweave-manifest+json') {
                data = yield dataDB.findOne(transaction);
                const manifestData = JSON.parse(decoder.decode((0, encoding_1.b64UrlToBuffer)(data.data)));
                const indexPath = manifestData.index.path;
                const subPath = getManifestSubpath(ctx.path);
                if (subPath) {
                    if (!manifestData.paths[subPath]) {
                        ctx.status = 404;
                        ctx.body = {
                            status: 404,
                            error: 'Data not found in the manifest',
                        };
                        return;
                    }
                    transaction = manifestData.paths[subPath].id;
                    metadata = yield transactionDB.getById(transaction);
                    if (!metadata) {
                        ctx.status = 404;
                        ctx.body = { status: 404, error: 'Tx not found' };
                        return;
                    }
                }
                else {
                    if (indexPath) {
                        transaction = manifestData.paths[indexPath].id;
                        metadata = yield transactionDB.getById(transaction);
                        if (!metadata) {
                            ctx.status = 404;
                            ctx.body = { status: 404, error: 'Index TX not Found' };
                            return;
                        }
                    }
                }
                ctx.type = utils_1.Utils.tagValue(metadata.tags, 'Content-Type');
            }
            else
                ctx.type = contentType || 'text/plain';
        }
        catch (error) {
            console.error({ error });
            ctx.type = utils_1.Utils.tagValue(metadata.tags, 'Content-Type') || 'text/plain';
        }
        data = yield dataDB.findOne(transaction);
        ctx.logging.log(metadata);
        ctx.logging.log(data);
        let body;
        // add seek support to audio and video
        if (ctx.type.includes('audio') || ctx.type.includes('video')) {
            ctx.set({
                'Content-Range': `bytes 0-${metadata.data_size}/${metadata.data_size}`,
                'Accept-Ranges': 'bytes',
            });
        }
        if (!(data === null || data === void 0 ? void 0 : data.data)) {
            let chunks = yield chunkDB.getRoot(metadata.data_root);
            if (chunks === null || chunks === void 0 ? void 0 : chunks.length) {
                // filter duplicate data chunks
                const chunksHash = Array.from(new Set(chunks.map((c) => (0, encoding_1.sha256Hex)(c.chunk))));
                chunks = chunksHash.map((h) => chunks.find((c) => (0, encoding_1.sha256Hex)(c.chunk) === h));
                chunks.sort((a, b) => a.offset - b.offset);
                const chunk = chunks.map((ch) => Buffer.from((0, encoding_1.b64UrlToBuffer)(ch.chunk)));
                body = Buffer.concat(chunk);
                ctx.body = body;
                return;
            }
        }
        else
            body = data.data[0] === '[' ? data.data : Buffer.from((0, encoding_1.b64UrlToBuffer)(data.data));
        ctx.body = body;
    });
}
exports.dataRoute = dataRoute;
function subDataRoute(ctx, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // get the referrer url
            const { referer } = ctx.headers;
            // parse the url
            const url = new url_1.URL(referer);
            // Check if there was id before the data
            const txid = getTxIdFromPath(url.pathname);
            if (!txid) {
                return yield next();
            }
            // Redirect
            ctx.redirect(`${referer}${ctx.path}`);
        }
        catch (error) {
            yield next();
        }
    });
}
exports.subDataRoute = subDataRoute;
const getTxIdFromPath = (path) => {
    const matches = path.match(/^\/?([a-z0-9-_]{43})/i) || [];
    return matches[1];
};
const getManifestSubpath = (requestPath) => {
    return getTransactionSubpath(requestPath);
};
const getTransactionSubpath = (requestPath) => {
    const subpath = requestPath.match(/^\/?[a-zA-Z0-9-_]{43}\/(.*)$/i);
    return (subpath && subpath[1]) || undefined;
};
//# sourceMappingURL=data.js.map