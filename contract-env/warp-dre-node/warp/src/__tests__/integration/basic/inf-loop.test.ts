import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { timeout } from '../../../utils/utils';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

let arweave: Arweave;
let arlocal: ArLocal;
let warp: Warp;
let contract: Contract<ExampleContractState>;

interface ExampleContractState {
  counter: number;
}

describe('Testing the Warp client', () => {
  let contractSrc: string;

  let wallet: JWKInterface;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(1830, false);
    await arlocal.start();

    LoggerFactory.INST.logLevel('error');
    warp = WarpFactory.forLocal(1830).use(new DeployPlugin());
    ({ jwk: wallet } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../data/inf-loop-contract.js'), 'utf8');

    // deploying contract using the new SDK.
    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({
        counter: 10
      }),
      src: contractSrc
    });

    contract = warp
      .contract<ExampleContractState>(contractTxId)
      .setEvaluationOptions({
        maxInteractionEvaluationTimeSeconds: 1,
        mineArLocalBlocks: false
      })
      .connect(wallet);

    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should properly deploy contract with initial state', async () => {
    expect(await contract.readState()).not.toBeUndefined();
  });

  it('should run the non blocking function', async () => {
    await contract.writeInteraction({
      function: 'add'
    });
    await mineBlock(warp);

    expect((await contract.readState()).cachedValue.state.counter).toEqual(20);
  });

  it('should exit long running function', async () => {
    await contract.writeInteraction({
      function: 'loop'
    });
    await mineBlock(warp);

    await contract.writeInteraction({
      function: 'add'
    });
    await mineBlock(warp);

    // wait for a while for the "inf-loop" to finish
    // otherwise Jest will complain that there are unresolved promises
    // after finishing the tests
    try {
      await timeout(2).timeoutPromise;
    } catch {
      // noop
    }
    expect((await contract.readState()).cachedValue.state.counter).toEqual(30);
  });
});
