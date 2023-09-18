
let { writeInteraction } = require('@permaweb/ao-sdk');

let msgCallStack = require('../dataStore/msgCallStack');
let dreClient = require('../clients/dre');
let config = require('../config');

const processor = {
    msgCallStack: msgCallStack,
    dreNode: null,

    process: async function(txId, messages, dreNode) {
        this.dreNode = dreNode;

        this.msgCallStack.writeStack(txId, messages, null);
        let initialMessages = this.msgCallStack[txId];

        await Promise.all(initialMessages.map(msg => this.msgRecurse(msg)));
    },

    msgRecurse: async function(message) {
        let writeTx = await writeInteraction(
            message.target,
            {
                function: 'handleMessage',
                message: message.message
            },
            config.relayWallet,
            []
        );
        
        let newTxId = writeTx.originalTxId;

        let replyMessages = await dreClient.messages(this.dreNode, newTxId);

        if(replyMessages) {
            this.msgCallStack.writeStack(newTxId, replyMessages, message.txId);
            let moreMsgs = this.msgCallStack[newTxId];
            await Promise.all(moreMsgs.map(msg => this.msgRecurse(msg)));
        }
    }
}

module.exports = processor;