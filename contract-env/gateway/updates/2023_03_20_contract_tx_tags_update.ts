import {DatabaseSource} from '../src/db/databaseSource';
import {Benchmark} from 'warp-contracts';

async function updateContractTxTags() {
  require('dotenv').config({
    path: '.secrets/prod.env',
  });

  const dbSource = new DatabaseSource([{client: 'pg', url: process.env.DB_URL as string, primaryDb: true}]);

  console.log('connected');
  let rowsUpdated = 0;

  const benchmark = Benchmark.measure();

  while (true) {
    benchmark.reset();
    const result = await dbSource.raw(`SELECT contract_id
                                       FROM contracts
                                       WHERE contract_tx -> 'id' is not null
                                       limit 100;`);
    // console.log('select done');
    if (result.rows.length == 0) {
      break;
    }

    let values = ``;
    result.rows.forEach((r: any, i: number) => {
      i == result.rows.length - 1 ? (values += `'${r.contract_id}'`) : (values += `'${r.contract_id}', `);
    });
    // console.log('updating');
    await dbSource.raw(
      `UPDATE contracts
       SET contract_tx = contract_tx - 'id' - 'data' - 'owner' - 'format' - 'reward' - 'target' - 'last_tx'
           - 'quantity' - 'data_root' - 'data_size' - 'data_tree' - 'signature'
       WHERE contract_id IN (${values});`
    );

    rowsUpdated += result.rows.length;
    console.log(`Updating contract_tx column. ${rowsUpdated} rows updated (${benchmark.elapsed()}).`);
  }

  console.log(`Updating contract_tx column done. ${rowsUpdated}.`);
  process.exit(0);
}

updateContractTxTags()
  .then(() => console.log('contract_tx column update completed.'))
  .catch((e) => console.error(e));
