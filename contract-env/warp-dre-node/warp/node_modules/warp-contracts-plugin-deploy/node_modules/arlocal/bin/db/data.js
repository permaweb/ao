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
exports.DataDB = void 0;
const path_1 = require("path");
const fs_1 = require("fs");
class DataDB {
    constructor(dbPath) {
        this.path = (0, path_1.join)(dbPath, 'data-');
    }
    insert(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                (0, fs_1.writeFileSync)(this.path + obj.txid, typeof obj.data === 'string' ? obj.data : JSON.stringify(obj.data), 'utf8');
                return obj;
            }
            catch (error) {
                console.error({ error });
            }
        });
    }
    findOne(txid) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = (0, fs_1.readFileSync)(this.path + txid, 'utf8');
            return { txid, data };
        });
    }
}
exports.DataDB = DataDB;
//# sourceMappingURL=data.js.map