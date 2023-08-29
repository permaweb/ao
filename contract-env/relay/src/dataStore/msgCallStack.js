

// an object containing a call stack for every initial txId
const msgCallStack = {
    writeStack: function(txId, messages, parentTxId) {
        if(!this[txId]) {
            this[txId] = {
                parentTxId: parentTxId,
                messages: []
            };
        }
        this[txId] = this[txId].messages.concat(messages);
    }
};

module.exports = msgCallStack;