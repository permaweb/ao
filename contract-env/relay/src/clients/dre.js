


let dreClient = {
    messages: async function(dreNode, txId) {
        console.log(`${dreNode}/result/${txId}`);
        let resultResponse = await fetch(`${dreNode}/result/${txId}`);
        let resultJson = await resultResponse.json();

        if(!resultJson || !resultJson.messages) {
            return null;
        }

        return resultJson.messages;
    }
}

module.exports = dreClient;