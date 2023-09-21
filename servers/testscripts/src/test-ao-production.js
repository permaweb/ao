



const fs = require('fs');
const path = require('path');

const { ArweaveSigner } = require('warp-arbundles');

const { writeInteraction, readState } = require('@permaweb/ao-sdk');

const CONTRACT_TX_ID = "WbuuS2YjOq2fHsV4VIB7qI6G6aM3DX5nO8PmAn3LZvQ";
let CU_URL = "https://ao-cu-1.onrender.com";
let CONTRACT_ENDPOINT = '/contract/';

let MU_URL = "https://ao-mu-1.onrender.com";
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

    let writeAoInteraction = await writeInteraction(
        CONTRACT_TX_ID, 
        input, 
        signer, 
        tags
    );

    let txId = writeAoInteraction.originalTxId;

    console.log(writeAoInteraction);

    let crankResult = await fetch(`${MU_URL}${CRANK_ENDPOINT}${txId}`,  {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({cu: CU_URL})
    });

    let crankResultJson = await crankResult.json();

    console.log(crankResultJson);

    // let newState = await fetch(`${CU_URL}${CONTRACT_ENDPOINT}${CONTRACT_TX_ID}`);
    // let newStateJson = await newState.json();

    // console.log(newStateJson);
})();