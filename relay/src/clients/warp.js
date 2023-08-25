
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
            remoteStateSyncSource: dreNode + '/contract',
            unsafeClient: 'skip',
        };

        return this;
    },

    write: async function(contractId, wallet, input) {
        let c = this.warp
            .contract(contractId)
            .connect(wallet)
            .setEvaluationOptions(this.options);
        return await c.writeInteraction(input);
    }
}

module.exports = warpClient;