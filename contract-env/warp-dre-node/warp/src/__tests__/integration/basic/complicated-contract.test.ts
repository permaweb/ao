import fs from 'fs';

import ArLocal from 'arlocal';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import { VM2Plugin } from 'warp-contracts-plugin-vm2';

let arlocal: ArLocal;
let warp: Warp;
let warpVm: Warp;
let contract: Contract<any>;
let contractVM: Contract<any>;

describe('Testing the Warp client', () => {
  let contractSrc: string;

  let wallet: JWKInterface;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(1800, false);
    await arlocal.start();

    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(1800).use(new DeployPlugin());
    warpVm = WarpFactory.forLocal(1800).use(new DeployPlugin()).use(new VM2Plugin());

    ({ jwk: wallet } = await warp.generateWallet());
    contractSrc = fs.readFileSync(path.join(__dirname, '../data/very-complicated-contract.js'), 'utf8');

    // deploying contract using the new SDK.
    const { contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({}),
      src: contractSrc
    });

    contract = warp.contract(contractTxId).setEvaluationOptions({
      mineArLocalBlocks: false
    });
    contractVM = warpVm.contract(contractTxId).setEvaluationOptions({
      mineArLocalBlocks: false
    });
    contract.connect(wallet);
    contractVM.connect(wallet);

    await mineBlock(warp);
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should properly deploy contract with initial state', async () => {
    expect(await contract.readState()).not.toBeUndefined();
  });

  it('sandboxed should not allow to calculate state with "eval" in source code', async () => {
    await expect(contractVM.readState()).rejects.toThrowError(
      'Code generation from strings disallowed for this context'
    );
  });
});
