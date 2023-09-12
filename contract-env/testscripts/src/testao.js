



const fs = require('fs');
const path = require('path');

const { writeInteraction, readState } = require('@permaweb/ao-sdk');

const CONTRACT_TX_ID = "keh7Bnso2hB6iPQoE8yslLCZceGbMpY7Vwea_A3aUEA";

(async function () {
    console.log('Testing ao...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));

    let writeAoInteraction = await writeInteraction(CONTRACT_TX_ID, {}, walletKey);

    console.log(writeAoInteraction);
    
})();