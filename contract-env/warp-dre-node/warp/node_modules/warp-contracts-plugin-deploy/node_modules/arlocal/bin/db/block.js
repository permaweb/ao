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
exports.BlockDB = void 0;
const utils_1 = require("../utils/utils");
class BlockDB {
    constructor(connection) {
        this.connection = connection;
    }
    getOne() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.connection.select('*').from('blocks');
        });
    }
    getByIndepHash(indepHash) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.connection.queryBuilder().select('*').from('blocks').where('id', '=', indepHash).limit(1))[0];
        });
    }
    mine(height, previous, txs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const id = utils_1.Utils.randomID(64);
                yield this.connection
                    .insert({
                    id,
                    height,
                    mined_at: Date.now(),
                    previous_block: previous,
                    txs,
                    extended: '',
                })
                    .into('blocks');
                return id;
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getLastBlock() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return (yield this.connection('blocks').orderBy('created_at', 'desc').limit(1))[0];
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    getByHeight(height) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.connection.queryBuilder().select('*').from('blocks').where('height', '=', height).limit(1))[0];
        });
    }
    /**
     *
     * @param id Genesis block ID/indep_hash
     */
    insertGenesis(id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.connection
                    .insert({
                    id,
                    height: 0,
                    mined_at: Date.now(),
                    previous_block: '',
                    txs: [''],
                    extended: '',
                })
                    .into('blocks');
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
}
exports.BlockDB = BlockDB;
//# sourceMappingURL=block.js.map