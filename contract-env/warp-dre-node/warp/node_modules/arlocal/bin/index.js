#!/usr/bin/env node
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
const minimist_1 = __importDefault(require("minimist"));
const path_1 = require("path");
const app_1 = __importDefault(require("./app"));
const appdata_1 = require("./utils/appdata");
const argv = (0, minimist_1.default)(process.argv.slice(2));
const port = argv._.length && !isNaN(+argv._[0]) ? argv._[0] : 1984;
const showLogs = argv.hidelogs ? false : true;
const persist = argv.persist;
const fails = argv.fails || 0;
const dbPath = argv.dbpath ? (0, path_1.join)(process.cwd(), argv.dbpath) : (0, appdata_1.appData)('arlocal', '.db');
let app;
(() => __awaiter(void 0, void 0, void 0, function* () {
    app = new app_1.default(+port, showLogs, dbPath, !!persist, fails);
    yield app.start();
    process.on('SIGINT', stop);
    process.on('SIGTERM', stop);
}))();
function stop() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield app.stop();
        }
        catch (e) { }
    });
}
//# sourceMappingURL=index.js.map