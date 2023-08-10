/* eslint-disable */
import Arweave from 'arweave';
import {
  ArweaveGatewayInteractionsLoader,
  BlockHeightInteractionsSorter,
  Contract, DefaultEvaluationOptions, LexicographicalInteractionsSorter,
  LoggerFactory, RedstoneGatewayInteractionsLoader,
  Warp,
  WarpNodeFactory
} from '../src';
import {TsLogFactory} from '../src/logging/node/TsLogFactory';
import fs from 'fs';
import path from 'path';
import ArLocal from 'arlocal';
import {JWKInterface} from 'arweave/node/lib/wallet';

async function main() {
  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('error');
  LoggerFactory.INST.logLevel('info', 'sorting');
  const logger = LoggerFactory.INST.create('sorting');

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https'
  });


    const interactionsLoader = new RedstoneGatewayInteractionsLoader("https://gateway.redstone.finance/", {confirmed: true});

    const lexSorting = new LexicographicalInteractionsSorter(arweave);
    const interactions = await interactionsLoader.load("KT45jaf8n9UwgkEareWxPgLJk4oMWpI5NODgYVIF1fY", 0, 903341);
    const sorted = await lexSorting.sort([...interactions]);
    logger.info("\n\nLexicographical");
    sorted.forEach(v => {
      logger.info(`${v.node.block.height}:${v.node.id}: [${v.node.sortKey}]`);
    });
}

main().catch((e) => console.error(e));
