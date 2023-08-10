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
exports.getChunkOffsetRoute = exports.postChunkRoute = void 0;
const chunks_1 = require("../db/chunks");
const encoding_1 = require("../utils/encoding");
let chunkDB;
let oldDbPath;
function postChunkRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !chunkDB) {
                chunkDB = new chunks_1.ChunkDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const chunk = ctx.request.body;
            const lastOffset = yield chunkDB.getLastChunkOffset();
            if (!lastOffset)
                chunk.offset = (0, encoding_1.b64UrlToBuffer)(chunk.chunk).length;
            else {
                const lastChunk = yield chunkDB.getByOffset(lastOffset);
                chunk.offset = lastOffset + (0, encoding_1.b64UrlToBuffer)(lastChunk.chunk).length;
            }
            yield chunkDB.create(chunk);
            ctx.body = {};
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.postChunkRoute = postChunkRoute;
function getChunkOffsetRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (!chunkDB) {
                chunkDB = new chunks_1.ChunkDB(ctx.connection);
            }
            const offset = +ctx.params.offset;
            const chunk = yield chunkDB.getByOffset(offset);
            if (!chunk) {
                ctx.status = 204;
                return;
            }
            ctx.body = chunk;
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.getChunkOffsetRoute = getChunkOffsetRoute;
//# sourceMappingURL=chunk.js.map