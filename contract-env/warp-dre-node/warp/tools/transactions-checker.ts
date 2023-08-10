/* eslint-disable */
import interactions from './data/interactions.json';
import Arweave from 'arweave';
import { LoggerFactory } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import { GQLEdgeInterface } from 'smartweave/lib/interfaces/gqlResult';
import fs from 'fs';
import path from 'path';

async function main() {
  LoggerFactory.use(new TsLogFactory());

  const logger = LoggerFactory.INST.create('checker');
  LoggerFactory.INST.logLevel('debug');

  const arweave = Arweave.init({
    host: 'arweave.net', // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: 'https', // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false // Enable network request logging
  });

  const result = [];

  for (const t of interactions['cachedValue'] as Array<GQLEdgeInterface>) {
    const index: number = (interactions['cachedValue'] as Array<GQLEdgeInterface>).indexOf(t);
    const tx = t.node;

    logger.debug('Checking', {
      index,
      height: tx.block.height,
      id: tx.id
    });

    const transactionStatus = await arweave.transactions.getStatus(tx.id);

    let numberOfConfirmations = null;
    let blockHeight = null;
    let properNumberOfConfirmations = null;
    let confirmationsDiff = null;
    let currentHeight = null;
    let lowConfirmations = false;
    let tooBigConfirmationsDiff = false;

    if (transactionStatus.status !== 404 && transactionStatus.confirmed !== null) {
      const info = await arweave.network.getInfo();
      currentHeight = info.height;
      logger.debug('Current height:', currentHeight);

      numberOfConfirmations = transactionStatus.confirmed.number_of_confirmations;
      if (numberOfConfirmations < 10) {
        logger.warn('Low amount of confirmations:', numberOfConfirmations);
        lowConfirmations = true;
      }
      blockHeight = transactionStatus.confirmed.block_height;
      properNumberOfConfirmations = currentHeight - blockHeight;
      confirmationsDiff = currentHeight - blockHeight - numberOfConfirmations;
      if (confirmationsDiff > 2) {
        logger.warn('Too big confirmations diff', {
          numberOfConfirmations,
          properNumberOfConfirmations,
          confirmationsDiff
        });
        tooBigConfirmationsDiff = true;
      }
    } else {
      logger.warn('Wrong status', transactionStatus);
    }

    result.push({
      index: index,
      id: tx.id,
      status: transactionStatus.status,
      networkHeight: currentHeight,
      confirmations: numberOfConfirmations,
      height: blockHeight,
      theoreticalNumberOfConfirmations: properNumberOfConfirmations,
      confirmationsDiff: confirmationsDiff,
      lowConfirmations: lowConfirmations,
      tooBigConfirmationsDiff: tooBigConfirmationsDiff
    });
  }

  const resultString = JSON.stringify(result);
  fs.writeFileSync(path.join(__dirname, 'result_fixed.json'), resultString);
}

main().catch((e) => console.error(e));
