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
exports.WalletDB = void 0;
const utils_1 = require("../utils/utils");
class WalletDB {
    constructor(connection) {
        this.connection = connection;
    }
    addWallet(wallet) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.connection
                .insert({
                id: utils_1.Utils.randomID(64),
                address: wallet.address,
                balance: wallet.balance || 0,
            })
                .into('wallets');
        });
    }
    getWallet(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.connection.queryBuilder().select('*').from('wallets').where('address', '=', address).limit(1))[0];
        });
    }
    getWalletBalance(address) {
        return __awaiter(this, void 0, void 0, function* () {
            const wallet = yield this.getWallet(address);
            if (!wallet)
                return 0;
            // default wallet.balance to 0 incase wallet.balance = null;
            return wallet.balance || 0;
        });
    }
    getLastTx(address) {
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.connection
                .queryBuilder()
                .select('*')
                .from('transactions')
                .where('owner_address', '=', address)
                .orderBy('created_at', 'desc')
                .limit(1))[0];
        });
    }
    updateBalance(address, balance) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.connection('wallets').update({ balance }).where({ address });
        });
    }
    incrementBalance(address, balance) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.connection('wallets').increment('balance', balance).where({ address });
            }
            catch (error) {
                console.log({ error });
            }
        });
    }
    decrementBalance(address, balance) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                return yield this.connection('wallets').decrement('balance', balance).where({ address });
            }
            catch (error) {
                console.log({ error });
            }
        });
    }
}
exports.WalletDB = WalletDB;
//# sourceMappingURL=wallet.js.map