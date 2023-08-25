import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';

import {
  InteractionResult,
  LoggerFactory,
  PstState,
  Warp,
  SMART_WEAVE_TAGS,
  WARP_TAGS,
  WarpFactory,
  TagsParser,
  ArweaveWrapper,
  WasmSrc
} from '../../..';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import path from 'path';
import { PstContract } from '../contract/definition/bindings/ts/PstContract';
import { State } from '../contract/definition/bindings/ts/ContractState';
import { TheAnswerExtension } from './the-answer-plugin';
import { VRFPlugin } from 'warp-contracts-plugin-vrf';

jest.setTimeout(30000);

describe('Testing the Rust WASM Profit Sharing Token', () => {
  let contractSrc: Buffer;
  let contractGlueCodeFile: string;

  let wallet: JWKInterface;
  let walletAddress: string;

  let initialState: State;

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let pst: PstContract;
  let pst2: PstContract;
  let pst3: PstContract;

  let contractTxId: string;

  let properForeignContractTxId: string;
  let wrongForeignContractTxId: string;

  let arweaveWrapper: ArweaveWrapper;
  let tagsParser: TagsParser;

  beforeAll(async () => {
    // note: each tests suit (i.e. file with tests that Jest is running concurrently
    // with another files has to have ArLocal set to a different port!)
    arlocal = new ArLocal(1820, false);
    await arlocal.start();

    tagsParser = new TagsParser();

    LoggerFactory.INST.logLevel('error');
    LoggerFactory.INST.logLevel('debug', 'WASM:Rust');
    //LoggerFactory.INST.logLevel('debug', 'WasmContractHandlerApi');

    warp = WarpFactory.forLocal(1820).use(new DeployPlugin()).use(new TheAnswerExtension()).use(new VRFPlugin());
    ({ arweave } = warp);
    arweaveWrapper = new ArweaveWrapper(warp);

    ({ jwk: wallet, address: walletAddress } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../contract/implementation/pkg/rust-contract_bg.wasm'));
    const contractSrcCodeDir: string = path.join(__dirname, '../contract/implementation/src');
    contractGlueCodeFile = path.join(__dirname, '../contract/implementation/pkg/rust-contract.js');
    const stateFromFile: PstState = JSON.parse(fs.readFileSync(path.join(__dirname, './data/token-pst.json'), 'utf8'));

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
      wasmSrcCodeDir: contractSrcCodeDir,
      wasmGlueCode: contractGlueCodeFile
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
      wasmSrcCodeDir: contractSrcCodeDir,
      wasmGlueCode: contractGlueCodeFile
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
      wasmSrcCodeDir: contractSrcCodeDir,
      wasmGlueCode: contractGlueCodeFile
    }));

    pst = new PstContract(contractTxId, warp);
    pst2 = new PstContract(properForeignContractTxId, warp);
    pst3 = new PstContract(wrongForeignContractTxId, warp);

    // connecting wallet to the PST contract
    pst.connect(wallet).setEvaluationOptions({ internalWrites: true });
    pst2.connect(wallet).setEvaluationOptions({ internalWrites: true });
    pst3.connect(wallet).setEvaluationOptions({ useKVStorage: true });
  });

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
    expect(tagsParser.getTag(contractSrcTx, WARP_TAGS.WASM_META)).toBeTruthy();

    const srcTxData = await arweaveWrapper.txData(contractSrcTxId);
    const wasmSrc = new WasmSrc(srcTxData);
    expect(wasmSrc.wasmBinary()).not.toBeNull();
    expect(wasmSrc.additionalCode()).toEqual(fs.readFileSync(contractGlueCodeFile, 'utf-8'));
    expect((await wasmSrc.sourceCode()).size).toEqual(12);
  });

  it('should read pst state and balance data', async () => {
    expect(await pst.currentState()).toEqual(initialState);
    expect((await pst.balance({ target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M' })).balance).toEqual(10000000);
    expect((await pst.balance({ target: '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA' })).balance).toEqual(23111222);
    expect((await pst.balance({ target: walletAddress })).balance).toEqual(555669);
  });

  it('should properly use the_answer plugin', async () => {
    expect((await pst.balance({ target: 'the_answer' })).balance).toEqual(42);
    expect((await pst.balance({ target: 'double_the_answer' })).balance).toEqual(2 * 42);
    expect((await pst.kvGet({ key: 'the_answer' })).value).toEqual('the_answer_is_42');
    expect((await pst.kvGet({ key: 'the_answer_wrapped' })).value).toEqual('the_answer_for_context_is_42');
  });

  it('should properly transfer tokens', async () => {
    await pst.transfer(
      {
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 555
      },
      { vrf: true }
    );

    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 555);
  });

  it('should properly use KV', async () => {
    await pst3.kvPut(
      {
        key: 'key1',
        value: 'value1'
      },
      { vrf: true }
    );
    const ok = await pst3.kvGet({ key: 'key1' });
    expect(ok.key).toEqual('key1');
    expect(ok.value).toEqual('value1');
    const nok = await pst3.kvGet({ key: 'non-existent' });
    expect(nok.key).toEqual('non-existent');
    expect(nok.value).toEqual('');
  });

  it('should properly view contract state', async () => {
    const result = await pst.balance({ target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M' });
    expect(result.balance).toEqual(10000000 + 555);
    expect(result.ticker).toEqual('EXAMPLE_PST_TOKEN');
    expect(result.target).toEqual('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M');
  });

  // note: the dummy logic on the test contract should add 1000 tokens
  // to each address, if the foreign contract state 'ticker' field = 'FOREIGN_PST'
  it('should properly read foreign contract state', async () => {
    await pst.foreignRead(
      {
        contractTxId: wrongForeignContractTxId
      },
      { vrf: true }
    );
    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 555);
    await pst.foreignRead(
      {
        contractTxId: properForeignContractTxId
      },
      { vrf: true }
    );
    expect((await pst.currentState()).balances[walletAddress]).toEqual(555669 - 555 + 1000);
    expect((await pst.currentState()).balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(
      10000000 + 555 + 1000
    );
  });

  it('should properly view foreign contract state', async () => {
    const res = await pst.foreignView({
      contractTxId: properForeignContractTxId,
      target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M'
    });
    expect(res.ticker).toEqual('FOREIGN_PST');
    expect(res.target).toEqual('uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M');
    expect(res.balance).toEqual(10_000_000);
  });

  it('should propagate error from view foreign contract state', async () => {
    let exc;
    try {
      await pst.foreignView({
        contractTxId: properForeignContractTxId,
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M-Invalid'
      });
    } catch (e) {
      exc = e;
    }
    expect(exc).toHaveProperty('error.kind', 'WalletHasNoBalanceDefined');
    expect(exc).toHaveProperty('error.data', 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M-Invalid');
  });

  it('should properly perform internal write', async () => {
    const balance = (await pst2.balance({ target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M' })).balance;

    await pst.foreignWrite(
      {
        contractTxId: properForeignContractTxId,
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 555
      },
      { vrf: true }
    );

    expect((await pst2.balance({ target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M' })).balance).toEqual(
      balance + 555
    );
    expect((await pst2.balance({ target: walletAddress })).balance).toEqual(555669 - 555);
  });

  it('should properly perform dry write with overwritten caller', async () => {
    const { address: overwrittenCaller } = await warp.generateWallet();

    await pst.transfer(
      {
        target: overwrittenCaller,
        qty: 1000
      },
      { vrf: true }
    );

    // note: transfer should be done from the "overwrittenCaller" address, not the "walletAddress"
    const result: InteractionResult<State, unknown> = await pst.contract.dryWrite(
      {
        function: 'transfer',
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 333
      },
      overwrittenCaller,
      undefined,
      undefined,
      true
    );

    expect(result.state.balances[walletAddress]).toEqual(555114 - 1000 + 1000);
    expect(result.state.balances['uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M']).toEqual(10000000 + 1000 + 555 + 333);
    expect(result.state.balances[overwrittenCaller]).toEqual(1000 - 333);
  });

  it('should properly handle runtime errors', async () => {
    const result = await pst.contract.dryWrite(
      {
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 555
      },
      undefined,
      undefined,
      undefined,
      true
    );

    expect(result.type).toEqual('exception');
    expect(result).toHaveProperty('errorMessage');
  });

  it('should properly handle contract errors', async () => {
    const result = await pst.contract.dryWrite(
      {
        function: 'transfer',
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 0
      },
      undefined,
      undefined,
      undefined,
      true
    );

    expect(result.type).toEqual('error');
    expect(result.error).toHaveProperty('kind', 'TransferAmountMustBeHigherThanZero');
  });

  xit('should return stable gas results', async () => {
    const results: InteractionResult<State, unknown>[] = [];

    for (let i = 0; i < 10; i++) {
      const result = await pst.contract.dryWrite(
        {
          function: 'transfer',
          target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
          qty: 555
        },
        undefined,
        undefined,
        undefined,
        true
      );
      results.push(result);
    }

    results.forEach((result) => {
      expect(result.gasUsed).toEqual(9388933);
    });
  });

  xit('should honor gas limits', async () => {
    pst.setEvaluationOptions({
      gasLimit: 5000000
    });

    const result = await pst.contract.dryWrite(
      {
        function: 'transfer',
        target: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
        qty: 555
      },
      undefined,
      undefined,
      undefined,
      true
    );

    expect(result.type).toEqual('exception');
    expect(result.errorMessage?.startsWith('[RE:OOG] Out of gas!')).toBeTruthy();
  });

  it("should properly evolve contract's source code", async () => {
    const balance = (await pst.currentState()).balances[walletAddress];

    const newSource = fs.readFileSync(path.join(__dirname, './data/token-evolve.js'), 'utf8');

    const srcTx = await warp.createSource({ src: newSource }, wallet);
    const newSrcTxId = await warp.saveSource(srcTx);

    await pst.evolve({ value: newSrcTxId }, { vrf: true });

    // note: the evolved balance always adds 555 to the result
    expect((await pst.balance({ target: walletAddress })).balance).toEqual(balance + 555);
  });
});
