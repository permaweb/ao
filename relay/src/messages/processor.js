


let msgCallStack = require('../dataStore/msgCallStack');
let warpClient = require('../clients/warp');
let dreClient = require('../clients/dre');
let config = require('../config');

const processor = {
    msgCallStack: msgCallStack,
    warpCli: null,
    dreNode: null,

    process: async function(txId, messages, dreNode) {
        this.warpCli = warpClient.init(dreNode);
        this.dreNode = dreNode;

        this.msgCallStack.writeStack(txId, messages, null);
        let initialMessages = this.msgCallStack[txId];

        await Promise.all(initialMessages.map(msg => this.msgRecurse(msg)));
    },

    msgRecurse: async function(message) {
        let writeTx = await this.warpCli.write(
            message.target,
            config.relayWallet,
            {
                function: 'handleMessage',
                message: message.message
            }
        );

        // must read state to load the new state/sortKey into the DRE
        await this.warpCli.read(message.target, config.relayWallet);
        
        let newTxId = writeTx.originalTxId;

        let replyMessages = await dreClient.result(this.dreNode, newTxId);

        if(replyMessages) {
            this.msgCallStack.writeStack(newTxId, replyMessages, message.txId);
            let moreMsgs = this.msgCallStack[newTxId];
            await Promise.all(moreMsgs.map(msg => this.msgRecurse(msg)));
        }
    }
}

module.exports = processor;