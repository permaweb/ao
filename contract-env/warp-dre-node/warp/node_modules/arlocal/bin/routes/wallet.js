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
exports.addBalanceRoute = exports.updateBalanceRoute = exports.getLastWalletTxRoute = exports.createWalletRoute = exports.getBalanceRoute = exports.walletRegex = void 0;
const utils_1 = require("./../utils/utils");
const wallet_1 = require("../db/wallet");
let walletDB;
let oldDbPath;
exports.walletRegex = /[a-z0-9_-]{43}/i;
function getBalanceRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !walletDB) {
                walletDB = new wallet_1.WalletDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const address = ctx.params.address;
            ctx.body = yield walletDB.getWalletBalance(address);
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.getBalanceRoute = getBalanceRoute;
function createWalletRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !walletDB) {
                walletDB = new wallet_1.WalletDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const wallet = ctx.request.body;
            if (!(wallet === null || wallet === void 0 ? void 0 : wallet.address))
                wallet.address = utils_1.Utils.randomID();
            else if (!wallet.address.match(exports.walletRegex)) {
                ctx.status = 422;
                ctx.body = { status: 422, error: 'Address badly formatted' };
                return;
            }
            yield walletDB.addWallet(wallet);
            ctx.body = wallet;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.createWalletRoute = createWalletRoute;
function getLastWalletTxRoute(ctx) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !walletDB) {
                walletDB = new wallet_1.WalletDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const address = ctx.params.address;
            ctx.body = (_a = (yield walletDB.getLastTx(address))) === null || _a === void 0 ? void 0 : _a.id;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.getLastWalletTxRoute = getLastWalletTxRoute;
function updateBalanceRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !walletDB) {
                walletDB = new wallet_1.WalletDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const address = ctx.params.address;
            const body = ctx.request.body;
            if (!(body === null || body === void 0 ? void 0 : body.balance)) {
                ctx.status = 422;
                ctx.body = { status: 422, error: 'Balance is required !' };
                return;
            }
            yield walletDB.updateBalance(address, body.balance);
            ctx.body = body;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.updateBalanceRoute = updateBalanceRoute;
function addBalanceRoute(ctx) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            if (oldDbPath !== ctx.dbPath || !walletDB) {
                walletDB = new wallet_1.WalletDB(ctx.connection);
                oldDbPath = ctx.dbPath;
            }
            const address = ctx.params.address;
            const balance = +ctx.params.balance;
            const wallet = yield walletDB.getWallet(address);
            if (wallet) {
                yield walletDB.incrementBalance(address, balance);
                ctx.body = +wallet.balance + balance;
                return;
            }
            yield walletDB.addWallet({ address, balance });
            ctx.body = balance;
            return;
        }
        catch (error) {
            console.error({ error });
        }
    });
}
exports.addBalanceRoute = addBalanceRoute;
//# sourceMappingURL=wallet.js.map