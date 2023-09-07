


let dreClient = {
    result: async function(dreNode, txId) {
        console.log(`${dreNode}/result?tx=${txId}`)
        let resultResponse = await fetch(`${dreNode}/result?tx=${txId}`);
        let resultJson = await resultResponse.json();

        if(!resultJson || !resultJson.result || !resultJson.result.messages) {
            return null;
        }

        return resultJson.result.messages;
    }
}

module.exports = dreClient;