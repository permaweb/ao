

const fs = require('fs');
const path = require('path');
const Bundlr = require('@bundlr-network/client');

// hABxWC4uNAEsLbmOmMtZ5VCYjk_y6TfzPMWWHbN-ks4 beam-contract.js
// FNTYfkQNk2f4xBsc6gPWQJ5lYHw9Z4gQktuLhGx6xL0 beam-response-contract.js 

(async function() {

    console.log('Loading test contract...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));

    const bundlr = new Bundlr('https://node2.bundlr.network', 'arweave', walletKey);

    let CONTRACT_SRC = "lt94Ais2iRoE3l2WVXH0wgKeS4ieluZfsjpYTQTAvFA";

    let contractTags = [
        { name: 'Content-Type', value: 'text/plain' },
        { name: 'App-Name', value: 'SmartWeaveContract' },
        { name: 'App-Version', value: '0.3.0' },
        { name: 'Contract-Src', value: CONTRACT_SRC },
        {
          name: 'Init-State',
          value: JSON.stringify({
            balances: [
                {foo: 1}
            ]
        }),
        },
        { name: 'Title', value: 'ao test' },
        { name: 'Description', value: 'Description' },
        { name: 'Type', value: 'Text' },
    ];

    let tx = await bundlr.upload("ao test", { tags: contractTags });

    console.log(tx);

    CONTRACT_SRC = "eNhqR7FRGWDTYaHxg66qQQuAC6JjDYTLa7KGnQHPjMQ";

    contractTags = [
        { name: 'Content-Type', value: 'text/plain' },
        { name: 'App-Name', value: 'SmartWeaveContract' },
        { name: 'App-Version', value: '0.3.0' },
        { name: 'Contract-Src', value: CONTRACT_SRC },
        {
          name: 'Init-State',
          value: JSON.stringify({
            balances: [
                {foo: 1}
            ],
            sendToContract: tx.id
        }),
        },
        { name: 'Title', value: 'ao test' },
        { name: 'Description', value: 'Description' },
        { name: 'Type', value: 'Text' },
    ];

    tx = await bundlr.upload("ao test", { tags: contractTags });

    console.log(tx);

})();

