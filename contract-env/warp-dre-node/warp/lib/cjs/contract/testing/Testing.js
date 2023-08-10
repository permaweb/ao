"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Testing = void 0;
class Testing {
    constructor(arweave) {
        this.arweave = arweave;
    }
    async mineBlock() {
        this.validateEnv();
        await this.arweave.api.get('mine');
    }
    async addFunds(wallet) {
        const walletAddress = await this.arweave.wallets.getAddress(wallet);
        await this.arweave.api.get(`/mint/${walletAddress}/1000000000000000`);
    }
    async isArlocal() {
        const response = await fetch(`${this.arweave.api.config.protocol}://${this.arweave.api.config.host}:${this.arweave.api.config.port}/info`)
            .then((res) => {
            return res.ok ? res.json() : Promise.reject();
        })
            .catch((e) => {
            throw new Error(`Unable to get network info: ${e.message}`);
        });
        return response.network.includes('arlocal');
    }
    async validateEnv() {
        if (!(await this.isArlocal())) {
            throw new Error('Testing features are not available in a non testing environment');
        }
    }
}
exports.Testing = Testing;
//# sourceMappingURL=Testing.js.map