

import fs from 'fs';
import path from 'path';
import { defaultCacheOptions, WarpFactory } from 'warp-contracts';
import { DeployPlugin, ArweaveSigner} from 'warp-contracts-plugin-deploy';

(async function() {

    console.log('Loading test contract...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));
    
    let warp = WarpFactory.forMainnet({
        ...defaultCacheOptions,
        inMemory: true,
    }).use(new DeployPlugin());

    let signedWallet = new ArweaveSigner(walletKey);

    let src: string = fs.readFileSync(path.resolve(__dirname, 'beam-response-contract.js'), 'utf8');

    let initState = {
        balances: [
            {foo: 1}
        ]
    };

    let d = await warp.deploy({
        src: src,
        initState: JSON.stringify(initState),
        wallet: signedWallet,
    });

    console.log("first contract...")
    console.log(d);

    let src2: string = fs.readFileSync(path.resolve(__dirname, 'beam-contract.js'), 'utf8');

    let initState2 = {
        balances: [
            {foo: 1}
        ],
        sendToContract: d.contractTxId
    };

    let d2 = await warp.deploy({
        src: src2,
        initState: JSON.stringify(initState2),
        wallet: signedWallet,
    });

    console.log("second contract...")
    console.log(d2);

})();