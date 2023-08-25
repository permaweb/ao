/* eslint-disable */
import Arweave from 'arweave';
import {LoggerFactory, WarpNodeFactory} from '../src';
import {TsLogFactory} from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import {JWKInterface} from 'arweave/node/lib/wallet';

async function main() {
  let wallet: JWKInterface = readJSON('./.secrets/33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA.json');;
  LoggerFactory.INST.logLevel('error');
  LoggerFactory.INST.logLevel('info', 'custom-sign');
  LoggerFactory.INST.logLevel('debug', 'HandlerBasedContract');
  const logger = LoggerFactory.INST.create('custom-sign');

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  });

  try {
    const warp = WarpNodeFactory
      .memCachedBased(arweave)
      .useRedStoneGateway()
      .build();

    let customSignCalled = false;

    const result = await warp.contract("Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY")
      .connect(/*wallet*/async (tx) => {
        logger.info("Custom sign function");
        customSignCalled = true;
        const owner = wallet.n;
        logger.info("Owner:", owner);
        tx.setOwner(owner);
      })
      .viewState({function: "assetsLeft"});

    logger.info("customSignCalled", customSignCalled);
    logger.info("result", result);

  } catch (e) {
    logger.error(e)

  }

}

export function readJSON(path: string): JWKInterface {
  const content = fs.readFileSync(path, "utf-8");
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

main().catch((e) => console.error(e));
