/* eslint-disable */
import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { Contract } from '../../../contract/Contract';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { Warp } from '../../../core/Warp';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

/**
 * This tests verifies a standard approve/transferFrom workflow for a ERC-20ish token contract
 * and a staking contract.
 * 1. User approves certain amount of tokens for staking contract on the token contract
 * 2. User stakes certain amount of tokens on the staking contract - at this point the staking
 * contract makes an internal write to the token contract. The token contract verifies the
 * allowance for the staking contract - and if it is sufficient - performs a transfer on the
 * staking contract address.
 */
describe('Testing internal writes', () => {
  let tokenContractSrc: string;
  let tokenContractInitialState: string;
  let tokenContract: Contract<any>;
  let tokenContractTxId;

  let stakingContractSrc: string;
  let stakingContractInitialState: string;
  let stakingContract: Contract<any>;
  let stakingContractTxId;

  let wallet: JWKInterface;
  let walletAddress: string;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;

  const port = 1950;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(port, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('fatal');
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  async function deployContracts() {
    warp = WarpFactory.forLocal(port).use(new DeployPlugin());
    ({ arweave } = warp);

    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    tokenContractSrc = fs.readFileSync(path.join(__dirname, '../data/staking/erc-20.js'), 'utf8');
    tokenContractInitialState = fs.readFileSync(path.join(__dirname, '../data/staking/erc-20.json'), 'utf8');
    stakingContractSrc = fs.readFileSync(path.join(__dirname, '../data/staking/staking-contract.js'), 'utf8');
    stakingContractInitialState = fs.readFileSync(
      path.join(__dirname, '../data/staking/staking-contract.json'),
      'utf8'
    );

    ({ contractTxId: tokenContractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({
        ...JSON.parse(tokenContractInitialState),
        owner: walletAddress
      }),
      src: tokenContractSrc
    }));

    ({ contractTxId: stakingContractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({
        ...JSON.parse(stakingContractInitialState),
        tokenTxId: tokenContractTxId
      }),
      src: stakingContractSrc
    }));

    tokenContract = warp
      .contract(tokenContractTxId)
      .setEvaluationOptions({ internalWrites: true, mineArLocalBlocks: false })
      .connect(wallet);
    stakingContract = warp
      .contract(stakingContractTxId)
      .setEvaluationOptions({ internalWrites: true, mineArLocalBlocks: false })
      .connect(wallet);

    await mineBlock(warp);
  }

  describe('with read states in between', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should deploy contracts with initial state', async () => {
      expect((await tokenContract.readState()).cachedValue.state).toEqual({
        allowances: {},
        balances: {},
        owner: walletAddress,
        ticker: 'ERC-20',
        totalSupply: 0
      });
      expect((await stakingContract.readState()).cachedValue.state).toEqual({
        minimumStake: 1000,
        stakes: {},
        tokenTxId: tokenContractTxId,
        unstakePeriod: 10
      });
    });

    it('should mint tokens', async () => {
      await tokenContract.writeInteraction({
        function: 'mint',
        account: walletAddress,
        amount: 10000
      });
      await mineBlock(warp);

      const tokenState = (await tokenContract.readState()).cachedValue.state;

      expect(tokenState.balances).toEqual({
        [walletAddress]: 10000
      });
      expect(tokenState.totalSupply).toEqual(10000);
    });

    it('should not stake tokens if no allowance', async () => {
      await stakingContract.writeInteraction({
        function: 'stake',
        amount: 1000
      });
      await mineBlock(warp);

      expect((await stakingContract.readState()).cachedValue.state.stakes).toEqual({});

      const tokenState = (await tokenContract.readState()).cachedValue.state;
      expect(tokenState.balances).toEqual({
        [walletAddress]: 10000
      });
    });

    it('should approve for staking contract', async () => {
      await tokenContract.writeInteraction({
        function: 'approve',
        spender: stakingContractTxId,
        amount: 9999
      });
      await mineBlock(warp);

      expect((await tokenContract.readState()).cachedValue.state.allowances).toEqual({
        [walletAddress]: {
          [stakingContractTxId]: 9999
        }
      });
    });

    it('should stake tokens', async () => {
      await stakingContract.writeInteraction({
        function: 'stake',
        amount: 1000
      });
      await mineBlock(warp);

      expect((await stakingContract.readState()).cachedValue.state.stakes).toEqual({
        [walletAddress]: {
          amount: 1000,
          unlockWhen: 0
        }
      });

      const tokenState = (await tokenContract.readState()).cachedValue.state;
      expect(tokenState.balances).toEqual({
        [walletAddress]: 9000,
        [stakingContractTxId]: 1000
      });
      expect(tokenState.allowances).toEqual({
        [walletAddress]: {
          [stakingContractTxId]: 8999
        }
      });
    });
  });

  describe('with read states at the end', () => {
    beforeAll(async () => {
      await deployContracts();
    });

    it('should stake tokens', async () => {
      expect((await tokenContract.readState()).cachedValue.state).toEqual({
        allowances: {},
        balances: {},
        owner: walletAddress,
        ticker: 'ERC-20',
        totalSupply: 0
      });
      expect((await stakingContract.readState()).cachedValue.state).toEqual({
        minimumStake: 1000,
        stakes: {},
        tokenTxId: tokenContractTxId,
        unstakePeriod: 10
      });

      console.log('=========== MINT', (await arweave.network.getInfo()).height);
      await tokenContract.writeInteraction({
        function: 'mint',
        account: walletAddress,
        amount: 10000
      });
      await mineBlock(warp);

      console.log('=========== STAKE 1', (await arweave.network.getInfo()).height);
      await stakingContract.writeInteraction({
        function: 'stake',
        amount: 1000
      });
      await mineBlock(warp);

      console.log('=========== APPROVE', (await arweave.network.getInfo()).height);
      await tokenContract.writeInteraction({
        function: 'approve',
        spender: stakingContractTxId,
        amount: 9999
      });
      await mineBlock(warp);

      // at this point it may happen that "approve" interaction (made on block 4) will have higher sortKey generated,
      // then the "stake 2" interaction sortKey generated during the dry-run (both at block 4 for this case)
      // ...if that will be the case, the code in the "stake" contract itself
      // will throw a ContractError - before calling the SmartWeave.contracts.write on the token contract.
      // and if that will be the case, no "internal write" interaction will be generated and the token balances
      // won't match the expected values...
      // additional mineBlock fixes this issue (as it causes that the dry-write for the "stake" function will
      // run at 5 block height).
      await mineBlock(warp);

      console.log('=========== STAKE 2', (await arweave.network.getInfo()).height);
      await stakingContract.writeInteraction({
        function: 'stake',
        amount: 1000
      });

      await mineBlock(warp);

      console.log('=========== TOKEN READ', (await arweave.network.getInfo()).height);
      const tokenState = (await tokenContract.readState()).cachedValue.state;
      expect(tokenState.balances).toEqual({
        [walletAddress]: 9000,
        [stakingContractTxId]: 1000
      });
      expect(tokenState.allowances).toEqual({
        [walletAddress]: {
          [stakingContractTxId]: 8999
        }
      });
      console.log('reading staking state');
      expect((await stakingContract.readState()).cachedValue.state.stakes).toEqual({
        [walletAddress]: {
          amount: 1000,
          unlockWhen: 0
        }
      });
    });
  });
});
