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
exports.mine = exports.createTransaction = void 0;
const test_setup_1 = require("../test-setup");
function createTransaction(blockWeave, data = 'hello world') {
    return __awaiter(this, void 0, void 0, function* () {
        const tx = yield blockWeave.createTransaction({
            data,
        }, test_setup_1.wallet);
        tx.addTag('App-Name', 'blockWeave');
        tx.addTag('Content-Type', 'text/plain');
        yield blockWeave.transactions.sign(tx, test_setup_1.wallet);
        yield blockWeave.transactions.post(tx);
        return tx.id;
    });
}
exports.createTransaction = createTransaction;
function mine(blockweave) {
    return __awaiter(this, void 0, void 0, function* () {
        yield blockweave.api.get('mine');
    });
}
exports.mine = mine;
//# sourceMappingURL=tests.js.map