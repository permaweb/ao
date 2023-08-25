/* eslint-disable */
import Arweave from 'arweave';
import { defaultCacheOptions, LoggerFactory, WarpFactory } from '../src';
import fs from 'fs';
import path from 'path';
import { JWKInterface } from 'arweave/node/lib/wallet';
import {ArweaveSigner, DeployPlugin} from "warp-contracts-plugin-deploy";

async function main() {
  let wallet: JWKInterface = readJSON('./.secrets/warp.json');
  LoggerFactory.INST.logLevel('info');
  //LoggerFactory.INST.logLevel('debug', 'ExecutionContext');
  const logger = LoggerFactory.INST.create('deploy');

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  });

  try {
    const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true })
      .use(new DeployPlugin());

    const jsContractSrc = fs.readFileSync(path.join(__dirname, 'data/js/token-pst.js'), 'utf8');
    const initialState = fs.readFileSync(path.join(__dirname, 'data/js/token-pst.json'), 'utf8');

    // case 1 - full deploy, js contract
   const { contractTxId, srcTxId } = await warp.deploy({
      wallet: new ArweaveSigner(wallet),
      initState: initialState,
      src: jsContractSrc
      /*evaluationManifest: {
        evaluationOptions: {
          useKVStorage: true
        }
      }*/
    });

    console.log('contractTxId:', contractTxId);
    console.log('srcTxId:', srcTxId);
    // case 2 - deploy from source, js contract
    /*const {contractTxId} = await warp.createContract.deployFromSourceTx({
      wallet,
      initState: initialState,
      srcTxId: "Hj0S0iK5rG8yVf_5u-usb9vRZg1ZFkylQLXu6rcDt-0",
    });*/

    // case 3 - full deploy, wasm contract
    /*const {contractTxId} = await warp.createContract.deploy({
      wallet,
      initState: initialState,
      src: wasmContractSrc,
      wasmSrcCodeDir: path.join(__dirname, 'data/rust/src'),
      wasmGlueCode: path.join(__dirname, 'data/rust/rust-pst.js')
    });*/

    // case 4 - deploy from source, wasm contract
    /*const {contractTxId} = await warp.createContract.deployFromSourceTx({
      wallet,
      initState: initialState,
      srcTxId: "5wXT-A0iugP9pWEyw-iTbB0plZ_AbmvlNKyBfGS3AUY",
    });*/

    const contract = warp.contract<any>('wAU7KuBFkyku-7pVfGk_gh9-eusog9L2TeBAgtGoRfk')
      .setEvaluationOptions({
        waitForConfirmation: true
      })
      .connect(wallet);

    /*await Promise.all([
      contract.writeInteraction<any>({
        function: 'origin'
      }),
      contract.writeInteraction<any>({
        function: 'origin'
      }),
      contract.writeInteraction<any>({
        function: 'origin'
      }),
      /!*contract.writeInteraction<any>({
        function: 'transfer',
        target: 'M-mpNeJbg9h7mZ-uHaNsa5jwFFRAq0PsTkNWXJ-ojwI',
        qty: 100
      }),*!/
      /!*contract.writeInteraction<any>({
        function: 'transfer',
        target: 'M-mpNeJbg9h7mZ-uHaNsa5jwFFRAq0PsTkNWXJ-ojwI',
        qty: 100
      }),
      contract.writeInteraction<any>({
        function: 'transfer',
        target: 'M-mpNeJbg9h7mZ-uHaNsa5jwFFRAq0PsTkNWXJ-ojwI',
        qty: 100
      }, {
        disableBundling: true
      })*!/
    ]);*/
    const {cachedValue} = await contract.readState();

    //logger.info("Result", await contract.getStorageValue('33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA'));
    console.dir(cachedValue.state);

    /*await contract.writeInteraction({
      function: "origin"
    }, { disableBundling: true });*/

  } catch (e) {
    //logger.error(e)
    throw e;
  }
}

export function readJSON(path: string): JWKInterface {
  const content = fs.readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

main().catch((e) => console.error(e));
