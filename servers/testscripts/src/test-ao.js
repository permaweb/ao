



const fs = require('fs');
const path = require('path');

const { ArweaveSigner } = require('warp-arbundles');

globalThis.MU_URL = "http://localhost:3004";
globalThis.CU_URL = "http://localhost:3005";
const { writeInteraction, readState } = require('@permaweb/ao-sdk');

const CONTRACT_TX_ID = "4ILANxSL3P4RtbbVamYynK6YLsPNUJ4WX1nYziOB0v4";
(async function () {
    console.log('Testing ao...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));
    let signer = new ArweaveSigner(walletKey);

    let input = { function: 'noop' };
    let tags = [];

    let s = await readState(CONTRACT_TX_ID);
    console.log(s)

    await writeInteraction(
        CONTRACT_TX_ID, 
        input, 
        signer, 
        tags
    );

    // let newState = await fetch(`${CU_URL}${CONTRACT_ENDPOINT}${CONTRACT_TX_ID}`);
    // let newStateJson = await newState.json();

    // console.log(newStateJson);
})();