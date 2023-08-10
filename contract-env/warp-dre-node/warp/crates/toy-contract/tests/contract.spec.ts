import fs from 'fs';

import ArLocal from 'arlocal';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import {
  LoggerFactory,
  Warp,
  SMART_WEAVE_TAGS,
  WARP_TAGS,
  WarpFactory,
  TagsParser,
  ArweaveWrapper,
  WasmSrc,
  Contract
} from '../../..';
import { DeployPlugin } from 'warp-contracts-plugin-deploy';
import path from 'path';

jest.setTimeout(30000);

class State {
  constructor(public x: Array<number>) {}
}

class View {
  constructor(public x: number) {}
}

class Action {
  constructor(public x: number) {}
}

describe('Testing the Rust WASM Profit Sharing Token', () => {
  let contractSrc: Buffer;
  let contractGlueCodeFile: string;

  let wallet: JWKInterface;

  const initialState = new State([0]);

  let arweave: Arweave;
  let arlocal: ArLocal;
  let warp: Warp;
  let toyContract: Contract<State>;

  let contractTxId: string;

  let arweaveWrapper: ArweaveWrapper;
  let tagsParser: TagsParser;

  beforeAll(async () => {
    arlocal = new ArLocal(1820, false);
    await arlocal.start();

    tagsParser = new TagsParser();
    LoggerFactory.INST.logLevel('debug');
    LoggerFactory.INST.logLevel('debug', 'WASM:Rust');
    //LoggerFactory.INST.logLevel('debug', 'WasmContractHandlerApi');

    warp = WarpFactory.forLocal(1820).use(new DeployPlugin());
    ({ arweave } = warp);
    arweaveWrapper = new ArweaveWrapper(warp);

    ({ jwk: wallet } = await warp.generateWallet());

    contractSrc = fs.readFileSync(path.join(__dirname, '../pkg/rust-contract_bg.wasm'));
    const contractSrcCodeDir: string = path.join(__dirname, '../src');
    contractGlueCodeFile = path.join(__dirname, '../pkg/rust-contract.js');

    // deploying contract using the new SDK.
    ({ contractTxId } = await warp.deploy({
      wallet,
      initState: JSON.stringify(initialState),
      src: contractSrc,
      wasmSrcCodeDir: contractSrcCodeDir,
      wasmGlueCode: contractGlueCodeFile
    }));

    toyContract = warp.contract<State>(contractTxId);

    // connecting wallet to the PST contract
    toyContract.connect(wallet);
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
    expect((await wasmSrc.sourceCode()).size).toEqual(1);
  });

  it('should read state', async () => {
    const { cachedValue } = await toyContract.readState();
    expect(cachedValue.state).toEqual(initialState);
  });

  it('should write/view state', async () => {
    await toyContract.writeInteraction<Action>(new Action(4));
    const interactionResult = await toyContract.viewState<Action, View>(new Action(1));
    expect(interactionResult.result.x).toEqual(4);
  });
});
