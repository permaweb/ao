/* eslint-disable */
import Arweave from 'arweave';
import { LoggerFactory } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import { WarpWebFactory } from '../src/core/web/WarpWebFactory';
import { FromFileInteractionsLoader } from './FromFileInteractionsLoader';
import { readContract } from 'smartweave';
import { readJSON } from '../../redstone-smartweave-examples/src/_utils';

async function main() {
  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('debug');

  const arweave = Arweave.init({
    host: 'arweave.net', // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: 'https', // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false // Enable network request logging
  });

  const smartweave = WarpWebFactory.memCached(arweave);

  const jwk = readJSON('../redstone-node/.secrets/redstone-jwk.json');

  const token = smartweave
    .contract('lnG1-1_5lAoABx7oihhRXI3J5ybTTQ2HCi2FJbKPI_w')
    // connecting wallet to a contract. It is required before performing any "writeInteraction"
    // calling "writeInteraction" without connecting to a wallet first will cause a runtime error.
    .connect(jwk)
    .setEvaluationOptions({
      // with this flag set to true, the write will wait for the transaction to be confirmed
      waitForConfirmation: true
    });

  const result = await token.writeInteraction<any>({
    function: 'transfer',
    data: {
      target: 'fake',
      qty: 15100900
    }
  });

  //const { state, validity } = await lootContract.readState();

  //fs.writeFileSync(path.join(__dirname, 'data', 'validity.json'), JSON.stringify(validity));
}

main().catch((e) => console.error(e));
