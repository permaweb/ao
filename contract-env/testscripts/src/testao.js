



const fs = require('fs');
const path = require('path');

const { ArweaveSigner } = require('warp-arbundles');

const { writeInteraction, readState } = require('@permaweb/ao-sdk');

const CONTRACT_TX_ID = "-YqxpCBjlWOLLnFXtvWpBYNc9g0dSC6nZpgMtp-FVGY";
let DRE_URL = "http://localhost:3005";
let CONTRACT_ENDPOINT = '/contract/';

let RELAY_URL = "http://localhost:3004";
let CRANK_ENDPOINT = "/crank/";

(async function () {
    console.log('Testing ao...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));
    let signer = new ArweaveSigner(walletKey);

    let input = { function: 'noop' };
    let tags = [];

    let s = await readState(CONTRACT_TX_ID);
    console.log(s)

    // let writeAoInteraction = await writeInteraction(
    //     CONTRACT_TX_ID, 
    //     input, 
    //     signer, 
    //     tags
    // );

    // let txId = writeAoInteraction.originalTxId;

    // console.log(writeAoInteraction);

    // let crankResult = await fetch(`${RELAY_URL}${CRANK_ENDPOINT}${txId}`,  {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json'
    //     },
    //     body: JSON.stringify({dre: DRE_URL})
    // });

    // let crankResultJson = await crankResult.json();

    // console.log(crankResultJson);

    // let newState = await fetch(`${DRE_URL}${CONTRACT_ENDPOINT}${CONTRACT_TX_ID}`);
    // let newStateJson = await newState.json();

    // console.log(newStateJson);
})();