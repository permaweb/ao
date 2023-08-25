/* eslint-disable */
import { connect } from '../src/db/connect';
import { isTxIdValid } from '../src/utils';

async function updateDb() {
  require('dotenv').config({
    path: '.secrets/local.env',
  });

  const db = connect();

  const result: any = await db.raw(
    `
        SELECT interaction_id, input 
        FROM interactions 
        WHERE function = 'evolve'
        AND evolve IS NULL;
      `
  );

  console.log(`Loading ${result.rows.length} evolve interactions.`);

  let updatedInteractions = 0;

  for (const r of result.rows) {
    const parsedInput = JSON.parse(r.input);
    let srcTxId: string;
    if (parsedInput.value && isTxIdValid(parsedInput.value)) {
      srcTxId = parsedInput.value;
    } else {
      continue;
    }
    updatedInteractions++;
    console.log(`Updating interaction: ${r.interaction_id} with evolve source tx id: ${srcTxId}`);
    await db('interactions').where({ interaction_id: r.interaction_id }).update({
      evolve: srcTxId,
    });
  }

  console.log(`${updatedInteractions} evolved contract sources have been inserted.`);
  process.exit(0);
}

updateDb().catch((e) => console.error(e));
