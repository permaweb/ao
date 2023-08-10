import fs from 'fs';

import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { PstState } from '../../../contract/PstContract';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

let arlocal: ArLocal;
let warp: Warp;
let contract: Contract<any>;
let contractWithUnsafe: Contract<any>;
let contractWithUnsafeSkip: Contract<any>;

describe('Testing the Warp client', () => {
  let contractSrc: string;

  let wallet: JWKInterface;
  let walletAddress: string;
  let initialState;
  let contractTxId;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(1801, false);
    await arlocal.start();

    LoggerFactory.INST.logLevel('error');
    warp = WarpFactory.forLocal(1801).use(new DeployPlugin());

    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());
    contractSrc = fs.readFileSync(path.join(__dirname, '../data/token-pst-unsafe.js'), 'utf8');

    const stateFromFile: PstState = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/token-pst.json'), 'utf8'));

    initialState = {
      ...stateFromFile,
      ...{
        owner: walletAddress,
        balances: {
          ...stateFromFile.balances,
          [walletAddress]: 555669
        }
      }
    };

    // deploying contract using the new SDK.
    ({ contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc
    }));

    contract = warp.contract(contractTxId).setEvaluationOptions({
      mineArLocalBlocks: false
    });
    contractWithUnsafe = warp.contract(contractTxId).setEvaluationOptions({
      unsafeClient: 'allow',
      mineArLocalBlocks: false
    });
    contractWithUnsafeSkip = warp.contract(contractTxId).setEvaluationOptions({
      unsafeClient: 'skip',
      mineArLocalBlocks: false
    });
    contract.connect(wallet);
    contractWithUnsafe.connect(wallet);
    contractWithUnsafeSkip.connect(wallet);

    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should not allow to evaluate contract with unsafe operations by default', async () => {
    await expect(contract.readState()).rejects.toThrowError('[SkipUnsafeError]');
  });

  it('should allow to evaluate contract with unsafe operations when evaluation option is set.', async () => {
    expect(await contractWithUnsafe.readState()).not.toBeUndefined();
  });

  it('should return initial state if unsafeClient = "skip"', async () => {
    await contractWithUnsafeSkip.writeInteraction({
      function: 'transfer',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });
    await mineBlock(warp);

    // even with 'skip', the unsafe client on root contract will throw
    await expect(contractWithUnsafeSkip.readState()).rejects.toThrow('[SkipUnsafeError]');

    // fresh warp instance - skip
    const newWarp = WarpFactory.forLocal(1801).use(new DeployPlugin());
    const freshPst = newWarp.contract(contractTxId).setEvaluationOptions({
      unsafeClient: 'skip'
    });
    await expect(freshPst.readState()).rejects.toThrow('[SkipUnsafeError]');
  });
});
