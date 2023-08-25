/* eslint-disable */
import got from 'got';
import { LoggerFactory } from '../src';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { sleep } from '../src/utils';

const viewblockUrl = 'https://viewblock.io/arweave/address/Daj-MNSnH55TDfxqC7v4eq0lKzVIwh98srUaWqyuZtY?page=';
const pageFrom = 36;
const pageTo = 42;

(async () => {
  LoggerFactory.use(new TsLogFactory());
  LoggerFactory.INST.logLevel('debug');
  const logger = LoggerFactory.INST.create('scraper');

  const transactions = {};

  for (let i = pageFrom; i <= pageTo; i++) {
    logger.info('Loading page', i);

    const response = await got(`${viewblockUrl}${i}`);
    logger.debug('Response:', {
      status: response.statusCode,
      message: response.statusMessage
    });

    const $ = cheerio.load(response.body);

    $('table > tbody > tr').each((index, element) => {
      let txId = null;
      let validity = null;

      const $tr = cheerio.load(element);

      $tr("td.ell > a[href^='/arweave/tx/']").each((idx2, el2) => {
        const tx = el2.attribs.href;
        txId = tx.replace('/arweave/tx/', '');
      });

      $tr('td > div').each((idx2, el2) => {
        if (idx2 !== 0) {
          return;
        }
        const title = el2.attribs.title;
        logger.debug(title);
        validity = title.localeCompare('Contract execution') === 0;
      });

      logger.debug(`${txId}: ${validity}`);
      transactions[txId] = validity;
    });

    await sleep(1000);
  }

  fs.writeFileSync(path.join(__dirname, 'data', 'viewblock-transactions-2.json'), JSON.stringify(transactions));
})();
