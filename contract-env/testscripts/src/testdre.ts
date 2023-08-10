

import fs from 'fs';
import path from 'path';
import { defaultCacheOptions, UnsafeClientOptions, WarpFactory } from 'warp-contracts';

(async function () {
    console.log('Testing test dre...');

    let contractId = "1_5_vDnDiuD2QVpNd9-r2QpL2SxyqIoKvXjtDgyy2l0";
    let dreNode = 'http://localhost/contract';

    const walletPath = process.env.PATH_TO_WALLET;

    let walletKey = JSON.parse(fs.readFileSync(path.resolve(walletPath), 'utf8'));
    
    let warp = WarpFactory.forMainnet({
        ...defaultCacheOptions,
        inMemory: true,
    });

    let u: UnsafeClientOptions = 'skip';

    let options = {
		allowBigInt: true,
		internalWrites: true,
		remoteStateSyncEnabled: true,
		remoteStateSyncSource: dreNode,
		unsafeClient: u,
	};

    let input = {function: "noop"};

    const warpContract = warp
        .contract(contractId)
        .connect(walletKey)
        .setEvaluationOptions(options);

    let res = await warpContract.writeInteraction(input);

    console.log("output")
    console.log(res);

    let state = await warpContract.readState();

    console.log(state.cachedValue.state);
    
})();