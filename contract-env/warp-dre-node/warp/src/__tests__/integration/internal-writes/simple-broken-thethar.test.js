import fs from 'fs';
import ArLocal from 'arlocal';
import path from 'path';
import {mineBlock} from '../_helpers';
import {WarpFactory} from '../../../core/WarpFactory';
import {LoggerFactory} from '../../../logging/LoggerFactory';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';

const PORT = 1970;

var simpleThetharTxId;
var arlocal, arweave, warp, walletJwk;
var erc20Contract, simpleThetarContract;

describe('flow with broken behaviour', () => {

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(PORT, false);
    await arlocal.start();
    LoggerFactory.INST.logLevel('error');

    warp = WarpFactory.forLocal(PORT).use(new DeployPlugin());
    ({jwk: walletJwk} = await warp.generateWallet());
    arweave = warp.arweave;
  });

  afterAll(async () => {
    await arlocal.stop();
  });

  const deployJS = async () => {
    const walletAddress = await arweave.wallets.jwkToAddress(walletJwk);

    // deploy TAR pst
    const erc20Src = fs.readFileSync(path.join(__dirname, '../data/staking/erc-20.js'), 'utf8');

    const tarInit = {
      symbol: 'TAR',
      name: 'ThetAR exchange token',
      decimals: 2,
      totalSupply: 20000,
      balances: {
        [walletAddress]: 10000,
      },
      allowances: {},
      settings: null,
      owner: walletAddress,
      canEvolve: true,
      evolve: '',
    };

    const erc20TxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(tarInit),
      src: erc20Src,
    })).contractTxId;
    erc20Contract = warp.contract(erc20TxId);
    erc20Contract.setEvaluationOptions({
      internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
    }).connect(walletJwk);

    // deploy thetAR contract
    const simpleThetharSrc = fs.readFileSync(path.join(__dirname, '../data/thethar/simple-thethar-contract.js'), 'utf8');
    const contractInit = {
      token: erc20TxId,
      orders: []
    };

    simpleThetharTxId = (await warp.createContract.deploy({
      wallet: walletJwk,
      initState: JSON.stringify(contractInit),
      src: simpleThetharSrc,
    })).contractTxId;
    simpleThetarContract = warp.contract(simpleThetharTxId);
    simpleThetarContract.setEvaluationOptions({
      internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true,
    }).connect(walletJwk);
  };

  const create = async (quantity) => {
    await erc20Contract.writeInteraction({
      function: 'approve',
      spender: simpleThetharTxId,
      amount: quantity
    });

    await mineBlock(warp);

    const txId = (await simpleThetarContract.writeInteraction({
      function: 'create'
    })).originalTxId;

    await mineBlock(warp);

    console.log('AFTER: ', JSON.stringify(await simpleThetarContract.readState()));
  }

  const cancel = async (orderId) => {
    console.log('cancel order...');

    const txId = await simpleThetarContract.writeInteraction({
      function: 'cancel',
      params: {
        orderId: orderId
      }
    });
    await mineBlock(warp);

    console.log('AFTER: ', JSON.stringify(await simpleThetarContract.readState()));
  }


  const readFull = async () => {
    const warp = WarpFactory.forLocal(PORT);

    let contract = warp.contract(simpleThetharTxId);
    contract.setEvaluationOptions({
      internalWrites: true,
      allowUnsafeClient: true,
      allowBigInt: true
    }).connect(walletJwk);

    const result = await contract.readState();

    console.log('Contract: ', JSON.stringify(result, null, "  "));

    return result;
  }

  it('correctly evaluate deferred state', async () => {
    await deployJS();
    await create(1);
    await cancel(0);

    console.error("========= READ FULL ==========")
    const result = await readFull();
    expect(result.cachedValue.state.orders.length).toEqual(0);

    const errorMessages = result.cachedValue.errorMessages;
    for (let errorMessageKey in errorMessages) {
      expect(errorMessages[errorMessageKey]).not.toContain('TransferFromZero');
    }
  });

});