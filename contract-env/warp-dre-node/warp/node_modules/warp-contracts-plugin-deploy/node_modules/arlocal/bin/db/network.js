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
exports.NetworkDB = void 0;
const path_1 = require("path");
const nedb_1 = __importDefault(require("nedb"));
const utils_1 = require("../utils/utils");
class NetworkDB {
    constructor(dbPath) {
        this.started = false;
        this.db = new nedb_1.default({ filename: (0, path_1.join)(dbPath, 'network.db') });
    }
    init() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.db.loadDatabase((err) => __awaiter(this, void 0, void 0, function* () {
                    if (err) {
                        return reject(err);
                    }
                    this.started = true;
                    yield this.insert({
                        network: 'arlocal.N.1',
                        version: 1,
                        release: 1,
                        queue_length: 0,
                        peers: 0,
                        height: 0,
                        current: utils_1.Utils.randomID(64),
                        blocks: 0,
                        node_state_latency: 0,
                    });
                    resolve(true);
                }));
            });
        });
    }
    insert(obj) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.started) {
                yield this.init();
            }
            return new Promise((resolve, reject) => {
                this.db.insert(obj, (err, doc) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(doc);
                });
            });
        });
    }
    findOne() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.started) {
                yield this.init();
            }
            return new Promise((resolve, reject) => {
                this.db.findOne({}, (err, doc) => {
                    if (err) {
                        return reject(err);
                    }
                    resolve(doc);
                });
            });
        });
    }
    increment(qty = 1) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.started) {
                yield this.init();
            }
            return new Promise((resolve, reject) => {
                this.db.update({}, {
                    $inc: { height: qty, blocks: qty },
                    $set: { current: utils_1.Utils.randomID(64) },
                }, { multi: true }, (err, numReplaced) => {
                    if (err) {
                        return reject(err);
                    }
                    if (numReplaced) {
                        return resolve(true);
                    }
                    resolve(false);
                });
            });
        });
    }
}
exports.NetworkDB = NetworkDB;
//# sourceMappingURL=network.js.map