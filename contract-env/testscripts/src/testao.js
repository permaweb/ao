



const fs = require('fs');
const path = require('path');

const { ArweaveSigner } = require('warp-arbundles');

const { writeInteraction, readState } = require('@permaweb/ao-sdk');

const CONTRACT_TX_ID = "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro";

(async function () {
    console.log('Testing ao...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));
    let signer = new ArweaveSigner(walletKey);

    let input = { function: 'noop' };
    let tags = [];

    let writeAoInteraction = await writeInteraction(CONTRACT_TX_ID, input, signer, tags);

    console.log(writeAoInteraction);
    
})();