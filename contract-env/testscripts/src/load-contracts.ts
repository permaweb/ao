

import fs from 'fs';
import path from 'path';
import { defaultCacheOptions, WarpFactory } from 'warp-contracts';
import { DeployPlugin, ArweaveSigner} from 'warp-contracts-plugin-deploy';



// hABxWC4uNAEsLbmOmMtZ5VCYjk_y6TfzPMWWHbN-ks4 beam-contract.js
// FNTYfkQNk2f4xBsc6gPWQJ5lYHw9Z4gQktuLhGx6xL0 beam-response-contract.js 



(async function() {

    console.log('Loading test contract...');

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));
    
    let warp = WarpFactory.forMainnet({
        ...defaultCacheOptions,
        inMemory: true,
    }).use(new DeployPlugin());

    let signedWallet = new ArweaveSigner(walletKey);

    // let src: string = fs.readFileSync(path.resolve(__dirname, 'beam-response-contract.js'), 'utf8');

    let initState = {
        balances: [
            {foo: 1}
        ]
    };

    let d = await warp.deployFromSourceTx({
        srcTxId: 'FNTYfkQNk2f4xBsc6gPWQJ5lYHw9Z4gQktuLhGx6xL0',
        initState: JSON.stringify(initState),
        wallet: signedWallet,
    });

    console.log("first contract...")
    console.log(d);

    // let src2: string = fs.readFileSync(path.resolve(__dirname, 'beam-contract.js'), 'utf8');

    let initState2 = {
        balances: [
            {foo: 1}
        ],
        sendToContract: d.contractTxId
    };

    let d2 = await warp.deployFromSourceTx({
        srcTxId: 'hABxWC4uNAEsLbmOmMtZ5VCYjk_y6TfzPMWWHbN-ks4',
        initState: JSON.stringify(initState2),
        wallet: signedWallet,
    });

    console.log("second contract...")
    console.log(d2);

})();

/**
 * first contract...
{
  contractTxId: 'a_dTXYvh1a6d4UQ5-bfxoeU1g-fb-6i92Aoctrll9T4',
  srcTxId: 'FNTYfkQNk2f4xBsc6gPWQJ5lYHw9Z4gQktuLhGx6xL0'
}
second contract...
{
  contractTxId: '9Gwws4SL80TcZvBxisbugqA5t43UbiUfivokKMcIiPs',
  srcTxId: 'hABxWC4uNAEsLbmOmMtZ5VCYjk_y6TfzPMWWHbN-ks4'
}
 */