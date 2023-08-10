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
exports.ChunkDB = void 0;
const utils_1 = require("../utils/utils");
class ChunkDB {
    constructor(connection) {
        this.connection = connection;
    }
    create({ chunk, data_root, data_size, offset, data_path }) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = utils_1.Utils.randomID(64);
                yield this.connection
                    .insert({
                    id: utils_1.Utils.randomID(64),
                    chunk,
                    data_root,
                    data_size,
                    offset,
                    data_path,
                })
                    .into('chunks');
                return id;
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getByRootAndSize(dataRoot, dataSize) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return (yield this.connection('chunks').where({ data_root: dataRoot, data_size: dataSize }))[0];
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getRoot(dataRoot) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.connection('chunks').where({ data_root: dataRoot });
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getByOffset(offset) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return (yield this.connection('chunks').where({ offset }))[0];
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getLowerOffset(offset) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return (yield this.connection('chunks').where('offset', '<', offset).orderBy('offset', 'desc'))[0];
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getLastChunkOffset() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const chunk = (yield this.connection('chunks').orderBy('offset', 'desc'))[0];
                if (!chunk || !chunk.offset) {
                    return 0;
                }
                return chunk.offset;
            }
            catch (error) {
                console.log('I crashed');
                console.error({ error });
            }
        });
    }
}
exports.ChunkDB = ChunkDB;
//# sourceMappingURL=chunks.js.map