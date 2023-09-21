

let msgCallStack = require('../dataStore/msgCallStack');
let cuClient = require('../clients/cu');
let sequencerClient = require('../clients/sequencer');

const processor = {
    msgCallStack: msgCallStack,
    cuAddress: null,

    process: async function(txId, messages, cuAddress) {
        this.cuAddress = cuAddress;

        this.msgCallStack.writeStack(txId, messages, null);
        let initialMessages = this.msgCallStack[txId];

        await Promise.all(initialMessages.map(msg => this.msgRecurse(msg)));
    },

    msgRecurse: async function(message) {
        let dataItem = await sequencerClient.buildAndSign(
            message.target,
            {
                function: 'handleMessage',
                message: message.message
            },
            []
        )

        await sequencerClient.writeInteraction(dataItem.getRaw());
        
        let newTxId = await dataItem.id;

        let replyMessages = await cuClient.messages(this.cuAddress, newTxId);

        if(replyMessages) {
            this.msgCallStack.writeStack(newTxId, replyMessages, message.txId);
            let moreMsgs = this.msgCallStack[newTxId];
            await Promise.all(moreMsgs.map(msg => this.msgRecurse(msg)));
        }
    }
}

module.exports = processor;