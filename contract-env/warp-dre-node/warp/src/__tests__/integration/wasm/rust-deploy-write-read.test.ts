import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import path from 'path';
import { mineBlock } from '../_helpers';
import { WasmSrc } from '../../../core/modules/impl/wasm/WasmSrc';
import { PstState, PstContract } from '../../../contract/PstContract';
import { Warp } from '../../../core/Warp';
import { WarpFactory } from '../../../core/WarpFactory';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { ArweaveWrapper } from '../../../utils/ArweaveWrapper';
import { TagsParser } from '../../../core/modules/impl/TagsParser';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import { SMART_WEAVE_TAGS, WARP_TAGS } from '../../../core/KnownTags';
import { InteractionResult } from '../../../core/modules/impl/HandlerExecutorFactory';

describe('Testing the Rust WASM Profit Sharing Token', () => {
  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: PstState;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst: PstContract;

  let contractTxId: string;

  let properForeignContractTxId: string;
  let wrongForeignContractTxId: string;

  let arweaveWrapper;
  let tagsParser: TagsParser;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(1201, false);
    await arlocal.start();

    LoggerFactory.INST.logLevel('error');
    tagsParser = new TagsParser();

    warp = WarpFactory.forLocal(1201).use(new DeployPlugin());
    ({ arweave } = warp);
    arweaveWrapper = new ArweaveWrapper(warp);

    ({ jwk: wallet } = await warp.generateWallet());
    walletAddress = await arweave.wallets.jwkToAddress(wallet);

    const contractSrc = fs.readFileSync(path.join(__dirname, '../data/wasm/rust/rust-pst_bg.wasm'));
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
      src: contractSrc,
      wasmSrcCodeDir: path.join(__dirname, '../data/wasm/rust/src'),
      wasmGlueCode: path.join(__dirname, '../data/wasm/rust/rust-pst.js')
    }));

    ({ contractTxId: properForeignContractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({
        ...initialState,
        ...{
          ticker: 'FOREIGN_PST',
          name: 'foreign contract'
        }
      }),
      src: contractSrc,
      wasmSrcCodeDir: path.join(__dirname, '../data/wasm/rust/src'),
      wasmGlueCode: path.join(__dirname, '../data/wasm/rust/rust-pst.js')
    }));

    ({ contractTxId: wrongForeignContractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify({
        ...initialState,
        ...{
          ticker: 'FOREIGN_PST_2',
          name: 'foreign contract 2'
        }
      }),
      src: contractSrc,
      wasmSrcCodeDir: path.join(__dirname, '../data/wasm/rust/src'),
      wasmGlueCode: path.join(__dirname, '../data/wasm/rust/rust-pst.js')
    }));

    // connecting to the PST contract
    pst = warp.pst(contractTxId);

    // connecting wallet to the PST contract
    pst.connect(wallet);

    await mineBlock(warp);
  }, 50000);

  afterAll(async () => {
    await arlocal.stop();
  });

  it('should properly deploy contract', async () => {
    const contractTx = await arweave.transactions.get(contractTxId);
    expect(contractTx).not.toBeNull();

    const contractSrcTxId = tagsParser.getTag(contractTx, SMART_WEAVE_TAGS.CONTRACT_SRC_TX_ID);
    const contractSrcTx = await arweave.transactions.get(contractSrcTxId);
    expect(tagsParser.getTag(contractSrcTx, SMART_WEAVE_TAGS.CONTENT_TYPE)).toEqual('application/wasm');
    expect(tagsParser.getTag(contractSrcTx, WARP_TAGS.WASM_LANG)).toEqual('rust');
    expect(tagsParser.getTag(contractSrcTx, WARP_TAGS.WASM_META)).toEqual(JSON.stringify({ dtor: 74 }));

    const srcTxData = await arweaveWrapper.txData(contractSrcTxId);
    const wasmSrc = new WasmSrc(srcTxData);
    expect(wasmSrc.wasmBinary()).not.toBeNull();
    expect(wasmSrc.additionalCode()).toEqual(
      fs.readFileSync(path.join(__dirname, '../data/wasm/rust/rust-pst.js'), 'utf-8')
    );
    expect((await wasmSrc.sourceCode()).size).toEqual(11);
  });

  it('should read pst state and balance data', async () => {
    expect(await pst.currentState()).toEqual(initialState);

    expect(await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M')).toEqual(10000000);
    expect(await pst.currentBalance('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA')).toEqual(23111222);
    expect(await pst.currentBalance(walletAddress)).toEqual(555669);
  });

  it('should properly transfer tokens', async () => {
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });

    await mineBlock(warp);

    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000555);
  });

  it('should properly view contract state', async () => {
    const result = await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M');
    expect(result).toEqual(10000000 + 555);
  });

  // note: the dummy logic on the test contract should add 1000 tokens
  // to each address, if the foreign contract state 'ticker' field = 'FOREIGN_PST'
  it('should properly read foreign contract state', async () => {
    await pst.writeInteraction({
      function: 'foreignCall',
      contract_tx_id: wrongForeignContractTxId
    });
    await mineBlock(warp);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 555);

    await pst.writeInteraction({
      function: 'foreignCall',
      contract_tx_id: properForeignContractTxId
    });
    await mineBlock(warp);
    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555 + 1000);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(
      10000000 + 555 + 1000
    );
  });

  xit('should return stable gas results', async () => {
    const results: InteractionResult<PstState, unknown>[] = [];

    for (let i = 0; i < 10; i++) {
      const result = await pst.dryWrite({
        function: 'transfer',
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 555
      });
      results.push(result);
    }

    results.forEach((result) => {
      expect(result.gasUsed).toEqual(9388933);
    });
  }, 10000);

  it('should properly handle runtime errors', async () => {
    const result = await pst.dryWrite({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });

    expect(result.type).toEqual('exception');
    expect(result.errorMessage).toEqual('[RE:RE] Error while parsing input');
  });

  it('should properly handle contract errors', async () => {
    const result = await pst.dryWrite({
      function: 'transfer',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 0
    });

    expect(result.type).toEqual('error');
    expect(result.errorMessage).toEqual('[CE:TransferAmountMustBeHigherThanZero]');
  });

  it("should properly evolve contract's source code", async () => {
    const result = await pst.currentBalance('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M');
    expect(result).toEqual(10000000 + 1000 + 555);

    const newContractSrc = fs.readFileSync(path.join(__dirname, '../data/wasm/rust/rust-pst-evolve_bg.wasm'));

    const srcTx = await warp.createSource(
      {
        src: newContractSrc,
        wasmSrcCodeDir: path.join(__dirname, '../data/wasm/rust/src-evolve'),
        wasmGlueCode: path.join(__dirname, '../data/wasm/rust/rust-pst-evolve.js')
      },
      wallet
    );
    const newSrcTxId = await warp.saveSource(srcTx);

    await mineBlock(warp);

    await pst.evolve(newSrcTxId);
    await mineBlock(warp);

    // note: evolve should add to the transfer additional 200
    await pst.transfer({
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });

    await mineBlock(warp);

    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(
      10000000 + 555 + 1000 + 555 + 200
    );
  });

  xit('should honor gas limits', async () => {
    pst.setEvaluationOptions({
      gasLimit: 5000000
    });

    const result = await pst.dryWrite({
      function: 'transfer',
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
      qty: 555
    });

    expect(result.type).toEqual('exception');
    expect(result.errorMessage?.startsWith('[RE:OOG] Out of gas!')).toBeTruthy();
  });
});
