/* eslint-disable */
import Arweave from 'arweave';
import {WriteInteractionResponse, LoggerFactory, WarpNodeFactory} from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import path from 'path';
import knex from 'knex';
import fs from 'fs';
import { JWKInterface } from 'arweave/node/lib/wallet';

const logger = LoggerFactory.INST.create('Contract');

//LoggerFactory.use(new TsLogFactory());
LoggerFactory.INST.logLevel('error');
LoggerFactory.INST.logLevel('info', 'Contract');
LoggerFactory.INST.logLevel('error', 'RedstoneGatewayInteractionsLoader');
LoggerFactory.INST.logLevel('debug', 'DefaultStateEvaluator');
LoggerFactory.INST.logLevel('debug', 'CacheableStateEvaluator');

async function main() {
  const arweave = Arweave.init({
    host: 'arweave.net', // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: 'https', // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false // Enable network request logging
  });

  const cacheDir = path.join(__dirname, 'db');
  const knexConfig = knex({
    client: 'sqlite3',
    connection: {
      filename: `${cacheDir}/db.sqlite`
    },
    useNullAsDefault: true
  });

  const warp = await WarpNodeFactory.memCached(arweave);

  const wallet: JWKInterface = readJSON('.secrets/33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA.json');

  const jsContractSrc = fs.readFileSync(path.join(__dirname, 'data/js/token-pst.js'), 'utf8');
  const initialState = fs.readFileSync(path.join(__dirname, 'data/js/token-pst.json'), 'utf8');

  // case 1 - full deploy, js contract
  const {contractTxId, srcTxId} = await warp.createContract.deploy(
    {
      wallet,
      initState: initialState,
      src: jsContractSrc
    },
    true
  );

  logger.info('tx id:', contractTxId);
  logger.info('src tx id:', srcTxId);

  // connecting to a given contract
  const token = warp
    .contract<any>(contractTxId)
    // connecting wallet to a contract. It is required before performing any "writeInteraction"
    // calling "writeInteraction" without connecting to a wallet first will cause a runtime error.
    .connect(wallet);

  const result: WriteInteractionResponse = await token.bundleInteraction<any>(
    {
      function: 'vrf'
    },
    { vrf: true }
  );

  console.log(result.bundlrResponse);

  /*const { state } = await token.readState();

  logger.info('State', state.vrf);*/

  /*const result = await token.writeInteraction({
    function: "transfer",
    target: "33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA",
    qty: 10
  }, [{
    name: SmartWeaveTags.INTERACT_WRITE,
    value: "33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA"
  },{
    name: SmartWeaveTags.INTERACT_WRITE,
    value: "4MnaOd-GvsE5iVQD4OhdY8DOrH3vo0QEqOw31HeIzQ0"
  }
  ]);*/

  //console.log(result);

  //console.log(await redstoneLoader.load("33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA", 0, 1_000_000));

  // UjZsNC0t5Ex7TjU8FIGLZcn_b3Af9OoNBuVmTAgp2_U
  /*const result1 = await token.readState();

  console.log(result1.state);
  console.log(token.lastReadStateStats());*/

  //logger.info("Amount of computed interactions before 'bundleInteraction':", Object.keys(result1.validity).length);

  /*for (let i = 0 ; i < 1100 ; i++) {
    console.log(`mint ${i + 1}`);
    try {
      const result = await token.bundleInteraction<any>({
        function: "transfer",
        target: "33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA",
        qty: 10
      });
    } catch(e:any) {

    }
    //await sleep(1);
  }*/

  /*logger.info("Result from the sequencer", result);

  // the new transaction is instantly available - ie. during the state read operation
  const result2 = await token.readState();

  logger.info("Amount of computed interactions after 'bundleInteraction':", Object.keys(result2.validity).length);
*/
}

function readJSON(path: string): JWKInterface {
  const content = fs.readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

main().catch((e) => console.error(e));
