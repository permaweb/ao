
const { defaultCacheOptions, WarpFactory } = require('warp-contracts');

let warpClient = {
    warp: null,
    options: null,

    init: function(dreNode) {
        this.warp = WarpFactory.forMainnet({
            ...defaultCacheOptions,
            inMemory: true,
        });
        
        this.options = {
            allowBigInt: true,
            internalWrites: true,
            remoteStateSyncEnabled: true,
            remoteStateSyncSource: dreNode,
            unsafeClient: 'skip',
        };

        return this;
    },

    write: async function(contractId, wallet, input) {
        console.log(wallet)
        console.log(this.options)
        console.log(contractId)
        return await this.warp
            .contract(contractId)
            .connect(wallet)
            .setEvaluationOptions(this.options)
            .writeInteraction(input);
    }
}

module.exports = warpClient;