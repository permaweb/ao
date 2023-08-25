/* eslint-disable */
import { connect } from '../src/db/connect';
import axios from 'axios';
import { Benchmark } from 'redstone-smartweave';
async function updateContractsWithBlockTimestamp() {
  require('dotenv').config({
    path: '.secrets/local.env',
  });

  const db = connect();

  const benchmark = Benchmark.measure();

  while (true) {
    const blockHeights: any = await db.raw(
      `   
            SELECT DISTINCT block_height 
            FROM contracts 
            WHERE block_timestamp IS NULL AND block_height IS NOT NULL 
            ORDER BY block_height ASC LIMIT 10;
        `
    );
    if (blockHeights?.rows?.length == 0) {
      console.log('====== Block timestamps updated! ======');
      break;
    }

    const res: any = await Promise.allSettled(
      blockHeights.rows.map(async (r: any) => {
        return axios.get(`https://arweave.net/block/height/${r.block_height}`);
      })
    );
    const resFulfilled = res.filter((r: any) => r.status == 'fulfilled');
    let values = '';
    let updateTemplate = (values: string) =>
      `
            UPDATE contracts 
            SET block_timestamp = tmp.block_timestamp 
            FROM (VALUES ${values}) AS tmp (block_height, block_timestamp) 
            WHERE contracts.block_height = tmp.block_height;  
        `;
    let valuesCounter = 0;

    const batchSize = resFulfilled.length;
    console.log('Batch size: ', batchSize ? batchSize : 'Batch empty this time...');
    for (const r of resFulfilled) {
      console.log(`Block height: ${r.value.data.height}, timestamp: ${r.value.data.timestamp}`);
      values += `(${r.value.data.height}, ${r.value.data.timestamp})`;
      if (valuesCounter < batchSize - 1) {
        values += ',';
      } else {
        console.log(`Updating ${batchSize} rows...`);
        await db.raw(updateTemplate(values));
        values = '';
        valuesCounter = 0;
      }
      valuesCounter++;
    }
  }

  console.log(`All block heights updated with timestamp in ${benchmark.elapsed()}.`);
  process.exit(0);
}

updateContractsWithBlockTimestamp().catch((e) => console.error(e));
