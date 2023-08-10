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
exports.resetRoute = exports.logsRoute = void 0;
const initialize_1 = require("../db/initialize");
const promises_1 = require("fs/promises");
const utils_1 = require("../utils/utils");
const block_1 = require("../db/block");
function logsRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            ctx.body = yield (0, promises_1.readFile)('./logs', 'utf-8');
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.logsRoute = logsRoute;
function resetRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const blockDB = new block_1.BlockDB(ctx.connection);
            ctx.network.blocks = 1;
            ctx.network.height = 0;
            ctx.network.current = utils_1.Utils.randomID(64);
            yield (0, initialize_1.up)(ctx.connection);
            yield blockDB.insertGenesis(ctx.network.current);
            ctx.body = 'reset done';
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.resetRoute = resetRoute;
//# sourceMappingURL=utils.js.map