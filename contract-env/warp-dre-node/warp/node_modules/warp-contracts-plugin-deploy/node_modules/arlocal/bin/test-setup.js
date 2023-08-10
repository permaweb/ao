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
exports.wallet = exports.port = exports.server = exports.ardb = exports.blockweave = void 0;
const app_1 = __importDefault(require("./app"));
const ardb_1 = __importDefault(require("ardb"));
const blockweave_1 = __importDefault(require("blockweave"));
let arLocalTesting;
jest.setTimeout(30000);
beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
    exports.port = Math.floor(Math.random() * (9000 - 5000 + 1) + 5000);
    const url = `http://127.0.0.1:${exports.port}`;
    arLocalTesting = new app_1.default(exports.port);
    yield arLocalTesting.start();
    exports.server = arLocalTesting.getServer();
    exports.blockweave = new blockweave_1.default({
        url,
        host: '127.0.0.1',
        port: exports.port,
        protocol: 'http',
        timeout: 20000,
        logging: true,
    }, [url]);
    exports.wallet = yield exports.blockweave.wallets.generate();
    const address = yield exports.blockweave.wallets.getAddress(exports.wallet);
    arLocalTesting.getWalletDb().addWallet({ address, balance: 100000000000000 });
    // @ts-ignore
    exports.ardb = new ardb_1.default(exports.blockweave);
    jest.spyOn(console, 'error');
    // @ts-ignore jest.spyOn adds this functionallity
    console.error.mockImplementation(() => null);
}));
afterEach(() => __awaiter(void 0, void 0, void 0, function* () {
    yield arLocalTesting.stop();
    exports.server = null;
    exports.blockweave = null;
    exports.blockweave = null;
    exports.ardb = null;
    exports.port = null;
    jest.spyOn(console, 'error');
    // @ts-ignore jest.spyOn adds this functionallity
    console.error.mockRestore();
}));
//# sourceMappingURL=test-setup.js.map