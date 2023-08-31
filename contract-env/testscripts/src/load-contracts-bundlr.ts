

import fs from 'fs';
import path from 'path';
import Bundlr from '@bundlr-network/client';
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

    const bundlr = new Bundlr('https://node2.bundlr.network', 'arweave', walletKey);

    const contractTags = [
        { name: 'Content-Type', value: 'text/plain' },
        { name: 'App-Name', value: 'SmartWeaveContract' },
        { name: 'App-Version', value: '0.3.0' },
        { name: 'Contract-Src', value: 'keh7Bnso2hB6iPQoE8yslLCZceGbMpY7Vwea_A3aUEA' },
        {
          name: 'Init-State',
          value: JSON.stringify({
            balances: [
                {foo: 1}
            ]
        }),
        },
        { name: 'Title', value: 'Hyperbeam test' },
        { name: 'Description', value: 'Description' },
        { name: 'Type', value: 'Text' },
    ];

    const tx = await bundlr.upload("hyperbeam test", { tags: contractTags });

    const { contractTxId } = await warp.register(tx.id, 'node2');
    console.log(`Check the data: https://arweave.net/${contractTxId}`);

})();

