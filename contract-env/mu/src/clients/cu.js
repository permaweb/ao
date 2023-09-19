


let cuClient = {
    messages: async function(cuAddress, txId) {
        console.log(`${cuAddress}/result/${txId}`);
        let resultResponse = await fetch(`${cuAddress}/result/${txId}`);
        let resultJson = await resultResponse.json();

        if(!resultJson || !resultJson.messages) {
            return null;
        }

        return resultJson.messages;
    }
}

module.exports = cuClient;