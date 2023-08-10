/* eslint-disable */
import Arweave from 'arweave';
import {
  LoggerFactory,
  MemCache,
  RedstoneGatewayContractDefinitionLoader,
  RedstoneGatewayInteractionsLoader,
  WarpNodeFactory
} from '../src';
import * as fs from 'fs';
import knex from 'knex';
import os from "os";
import {readJSON} from "../../redstone-smartweave-examples/src/_utils";
import {TsLogFactory} from '../src/logging/node/TsLogFactory';
import {FromContractInteractionsLoader} from "./FromContractInteractionsLoader";
import {load} from "cheerio";

const logger = LoggerFactory.INST.create('Contract');

LoggerFactory.use(new TsLogFactory());
LoggerFactory.INST.logLevel('error');

async function main() {
  const arweave = Arweave.init({
    host: 'arweave.net', // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: 'https', // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false // Enable network request logging
  });

  const jsContractTxId = "";
  const wasmContractTxId = "";

  const loader = new FromContractInteractionsLoader(jsContractTxId);

  const smartweave = WarpNodeFactory.memCachedBased(arweave)
    .setInteractionsLoader(loader)
    .build();

  const contract = smartweave.contract(wasmContractTxId);

  // if you want use other contract interactions, just do:
  //loader.contractTxId = "someotherJsContract";
  //await contract.readState();


  const {state, validity} = await contract.readState();

  const result = contract.lastReadStateStats();

  logger.warn('total evaluation: ', result);
  return;
}

main().catch((e) => console.error(e));
