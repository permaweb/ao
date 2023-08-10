/* eslint-disable */
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

interface ExampleContractState {
  counter: number;
  errorCounter: number;
}

describe('Testing internal writes', () => {
  let aftrContractSrc: string;
  let aftrContractInitialState: string;
  let pstContractSrc: string;
  let pstInitialState: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let arlocal: ArLocal;
  let warp: Warp;
  let aftr: Contract<any>;
  let pst: Contract<any>;
  let aftrTxId;
  let aftrSrcTxId;
  let pstTxId;

  let originalTxId; // set during tests, yeah it sucks, but fuck it for now.

  const port = 1966;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(port, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');
    //LoggerFactory.INST.logLevel('debug', 'HandlerBasedContract');
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  async function deployContracts() {
    warp = WarpFactory.forLocal(port).use(new DeployPlugin());
    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    aftrContractSrc = fs.readFileSync(path.join(__dirname, '../data/aftr/sampleContractSrc.js'), 'utf8');
    aftrContractInitialState = fs.readFileSync(
      path.join(__dirname, '../data/aftr/sampleContractInitState.json'),
      'utf8'
    );

    pstContractSrc = fs.readFileSync(path.join(__dirname, '../data/aftr/sampleContractSrc.js'), 'utf8');
    pstInitialState = fs.readFileSync(path.join(__dirname, '../data/aftr/pstInitState.json'), 'utf8');

    ({ contractTxId: aftrTxId, srcTxId: aftrSrcTxId } = await warp.deploy({
      wallet,
      initState: aftrContractInitialState,
      src: aftrContractSrc
    }));

    ({ contractTxId: pstTxId } = await warp.deployFromSourceTx({
      wallet,
      initState: pstInitialState,
      srcTxId: aftrSrcTxId
    }));

    aftr = warp
      .contract<any>(aftrTxId)
      .setEvaluationOptions({
        internalWrites: true
      })
      .connect(wallet);

    pst = warp
      .contract<any>(pstTxId)
      .setEvaluationOptions({
        internalWrites: true
      })
      .connect(wallet);

    await mineBlock(warp);
  }

  describe('AFTR testcase', () => {
    beforeAll(async () => {
      // this is the equivalent of "buttonPress1" from the original example
      await deployContracts();
    });

    // this is the equivalent of the original "buttonPress2"
    it('[buttonPress2] should properly read contracts state and mint pst tokens', async () => {
      // (o) check aftr initial state
      expect((await aftr.readState()).cachedValue.state).toEqual(JSON.parse(aftrContractInitialState));

      // (o) mint 10000 tokens in pst contract
      await pst.writeInteraction({
        function: 'mint',
        qty: 10000
      });

      const pstState = await pst.readState();

      // (o) verify pst state after minting the tokens
      expect(pstState.cachedValue.state).toEqual({
        name: 'Vint',
        ticker: 'VINT',
        balances: {
          [walletAddress]: 10000
        },
        claimable: [],
        claims: [],
        settings: [
          ['quorum', 0.5],
          ['support', 0.5],
          ['voteLength', 2160],
          ['lockMinLength', 129600],
          ['lockMaxLength', 1051200],
          ['communityAppUrl', ''],
          ['communityDiscussionLinks', ['']],
          ['communityDescription', ''],
          ['communityLogo', '']
        ]
      });
    });

    // this is the equivalent of the original "buttonPress3"
    it('[buttonPress3] should set allowance and make a deposit', async () => {
      const transferQty = 1;
      // (o) set allowance on pst contract for aftr contract
      ({ originalTxId } = await pst.writeInteraction(
        {
          function: 'allow',
          target: aftrTxId,
          qty: transferQty
        },
        { strict: true }
      ));

      // (o) make a deposit transaction on the aftr contract
      // note: this transaction makes internalWrite on pst contract
      // i.e. it calls PST's 'claim' function
      console.log('============= DEPOSIT TX =========');
      await aftr.writeInteraction(
        {
          function: 'deposit',
          tokenId: pstTxId,
          qty: transferQty,
          txID: originalTxId
        },
        { strict: true }
      );

      const aftrState = await aftr.readState();
      expect(aftrState.cachedValue.state).toEqual({
        name: 'AFTR',
        ticker: 'AFTR-v001',
        balances: {
          'abd7DMW1A8-XiGUVn5qxHLseNhkJ5C1Cxjjbj6XC3M8': 150000000,
          'Fof_-BNkZN_nQp0VsD_A9iGb-Y4zOeFKHA8_GK2ZZ-I': 100000000
        },
        creator: 'Fof_-BNkZN_nQp0VsD_A9iGb-Y4zOeFKHA8_GK2ZZ-I',
        ownership: 'single',
        votingSystem: 'weighted',
        status: 'stopped',
        claimable: [],
        claims: [],
        settings: [
          ['quorum', 0.5],
          ['support', 0.5],
          ['voteLength', 2000],
          ['lockMinLength', 100],
          ['lockMaxLength', 10000],
          ['communityAppUrl', ''],
          ['communityDiscussionLinks', ''],
          ['communityDescription', ''],
          ['communityLogo', ''],
          ['evolve', null]
        ],
        tokens: [
          {
            txID: `${originalTxId}`,
            tokenId: `${pstTxId}`,
            source: `${walletAddress}`,
            balance: 1,
            start: 4,
            name: 'Vint',
            ticker: 'VINT',
            logo: '',
            lockLength: 0
          }
        ]
      });

      const pstState = await pst.readState();
      expect(pstState.cachedValue.state).toEqual({
        name: 'Vint',
        ticker: 'VINT',
        balances: {
          [walletAddress]: 9999,
          [aftrTxId]: 1
        },
        claimable: [],
        claims: [`${originalTxId}`],
        settings: [
          ['quorum', 0.5],
          ['support', 0.5],
          ['voteLength', 2160],
          ['lockMinLength', 129600],
          ['lockMaxLength', 1051200],
          ['communityAppUrl', ''],
          ['communityDiscussionLinks', ['']],
          ['communityDescription', ''],
          ['communityLogo', '']
        ]
      });
    });
  });

  describe('AFTR test case - with a fresh Warp instance', () => {
    it('should properly read PST contract state', async () => {
      const newWarpInstance = WarpFactory.forLocal(port).use(new DeployPlugin());

      const pst2 = newWarpInstance.contract<ExampleContractState>(pstTxId).setEvaluationOptions({
        internalWrites: true
      });

      const pstState = await pst2.readState();
      expect(pstState.cachedValue.state).toEqual({
        name: 'Vint',
        ticker: 'VINT',
        balances: {
          [walletAddress]: 9999,
          [aftrTxId]: 1
        },
        claimable: [],
        claims: [`${originalTxId}`],
        settings: [
          ['quorum', 0.5],
          ['support', 0.5],
          ['voteLength', 2160],
          ['lockMinLength', 129600],
          ['lockMaxLength', 1051200],
          ['communityAppUrl', ''],
          ['communityDiscussionLinks', ['']],
          ['communityDescription', ''],
          ['communityLogo', '']
        ]
      });
    });
  });

  describe('AFTR test case - with an illegal read state after an internal write', () => {
    it('should throw an Error if contract makes readContractState after write on the same contract', async () => {
      const newWarpInstance = WarpFactory.forLocal(port).use(new DeployPlugin());
      const { jwk: wallet2 } = await newWarpInstance.generateWallet();

      const aftrBrokenContractSrc = fs.readFileSync(
        path.join(__dirname, '../data/aftr/sampleContractSrc_broken.js'),
        'utf8'
      );

      const aftrBrokenContractInitialState = fs.readFileSync(
        path.join(__dirname, '../data/aftr/sampleContractInitState.json'),
        'utf8'
      );
      const pst2InitState = fs.readFileSync(path.join(__dirname, '../data/aftr/pstInitState.json'), 'utf8');

      const { contractTxId: aftrBrokenTxId, srcTxId: brokenSrcTxId } = await newWarpInstance.deploy({
        wallet: wallet2,
        initState: aftrBrokenContractInitialState,
        src: aftrBrokenContractSrc
      });

      const { contractTxId: pst2TxId } = await newWarpInstance.deployFromSourceTx({
        wallet: wallet2,
        initState: pst2InitState,
        srcTxId: brokenSrcTxId
      });

      const aftrBroken = newWarpInstance
        .contract<any>(aftrBrokenTxId)
        .setEvaluationOptions({
          internalWrites: true
        })
        .connect(wallet2);

      const pst2 = newWarpInstance
        .contract<any>(pst2TxId)
        .setEvaluationOptions({
          internalWrites: true
        })
        .connect(wallet2);

      await mineBlock(newWarpInstance);

      // (o) mint 10000 tokens in pst contract
      await pst2.writeInteraction({
        function: 'mint',
        qty: 10000
      });

      const transferQty = 1;
      // (o) set allowance on pst contract for aftr contract
      const { originalTxId } = await pst2.writeInteraction({
        function: 'allow',
        target: aftrBrokenTxId,
        qty: transferQty
      });

      // (o) make a deposit transaction on the AFTR contract
      // note: this transaction makes internalWrite on PST contract
      // and then makes a readContractState on a PST contract
      // - such operation is not allowed.
      await expect(
        aftrBroken.writeInteraction(
          {
            function: 'deposit',
            tokenId: pst2TxId,
            qty: transferQty,
            txID: originalTxId
          },
          { strict: true }
        )
      ).rejects.toThrowError(
        /Calling a readContractState after performing an inner write is wrong - instead use a state from the result of an internal write./
      );
    });
  });
});
