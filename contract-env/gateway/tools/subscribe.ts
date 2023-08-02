/* eslint-disable */
import fs from 'fs';
import Bundlr from '@bundlr-network/client';
import { LoggerFactory, WarpFactory, defaultCacheOptions } from 'warp-contracts';
import { ArweaveSigner } from 'arbundles/src/signing';
import { createData } from 'arbundles';
import Arweave from 'arweave';
import { initPubSub, subscribe } from 'warp-contracts-pubsub';

async function main() {
  LoggerFactory.INST.logLevel('debug');
  const logger = LoggerFactory.INST.create('register');

  initPubSub();
  try {
    const isNode = new Function('try {return this===global;}catch(e){return false;}');
    if (isNode) {
      global.WebSocket = require('ws');
    }

    subscribe(
      `contracts`,
      async ({ data }: any) => {
        const message = JSON.parse(data);
        logger.debug('New message received', message);
      },
      console.error
    )
      .then(() => {
        logger.debug('Subscribed to interactions for');
      })
      .catch((e) => {
        logger.error('Error while subscribing', e.error);
      });
  } catch (e: any) {
    logger.error(e.error);
  }
}

main().catch((e) => console.error(e));
