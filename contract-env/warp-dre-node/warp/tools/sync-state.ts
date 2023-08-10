/* eslint-disable */
import Arweave from 'arweave';
import { LoggerFactory, WarpNodeFactory } from '../src';
import fs from 'fs';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';

async function main() {
  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('info');
  const logger = LoggerFactory.INST.create('den');

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  });

  try {
    const contract = await WarpNodeFactory.memCached(arweave)
      .contract('KT45jaf8n9UwgkEareWxPgLJk4oMWpI5NODgYVIF1fY')
      .syncState('https://d2rkt3biev1br2.cloudfront.net/state', { validity: true, safeHeight: true });

    const call = await contract.viewState({
      function: 'balance',
      target: 'ZTUZKdajVSLxqoGZVrK923Miuds-iIFGf28pzPHcwMY'
    });

    logger.info(call.result);
  } catch (e) {
    logger.error(e);
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
