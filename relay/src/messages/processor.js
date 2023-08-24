


let msgCallStack = require('../dataStore/msgCallStack');
let warpClient = require('../clients/warp');
let dreClient = require('../clients/dre');
let config = require('../config');
const { defaultCacheOptions, WarpFactory } = require('warp-contracts');

const processor = {
    msgCallStack: msgCallStack,
    warpCli: null,

    process: async function(txId, messages, dreNode) {
        this.msgCallStack.writeStack(txId, messages, null);

        this.warpCli = warpClient.init(dreNode);

        let initialMessages = this.msgCallStack[txId];

        await Promise.all(initialMessages.map(msg => this.msgRecurse(msg)));
    },

    msgRecurse: async function(message) {
        // let newTxId = (await this.warpCli.write(
        //     message.target,
        //     config.relayWallet,
        //     {
        //         function: `handleMessage`,
        //         ...message.message
        //     }
        // )).originalTxId;

        let warp = WarpFactory.forMainnet({
            ...defaultCacheOptions,
            inMemory: true,
        });

        let options = {
            allowBigInt: true,
            internalWrites: true,
            remoteStateSyncEnabled: true,
            remoteStateSyncSource: 'http://localhost/contract',
            unsafeClient: 'skip',
        };

        console.log(message.target);
        let r = await warp
        .contract(message.target)
        .connect(config.relayWallet)
        .setEvaluationOptions(options)
        .writeInteraction(message.message);

        let newTxId = r.originalTxId;

        let replyMessages = await dreClient.result(dreNode, newTxId);

        if(replyMessages) {
            this.msgCallStack.writeStack(newTxId, replyMessages, message.txId);
            let moreMsgs = this.msgCallStack[newTxId];
            console.log("more msgs");
            console.log(moreMsgs);
            await Promise.all(moreMsgs.map(msg => this.msgRecurse(msg)));
        }
    }
}

module.exports = processor;