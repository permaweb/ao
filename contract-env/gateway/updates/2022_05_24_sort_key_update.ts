/* eslint-disable */
import Arweave from 'arweave';
import { connect } from '../src/db/connect';
import { LexicographicalInteractionsSorter } from 'redstone-smartweave';

async function updateDb() {
  require('dotenv').config({
    path: '.secrets/local.env',
  });

  const db = connect();

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
  });

  const sorter = new LexicographicalInteractionsSorter(arweave);

  let round = 1;

  // update 'arweave' transactions
  while (true) {
    console.log(`Loading 10000 interactions: ${round}`);

    const result: any = await db.raw(
      `
          SELECT id, interaction_id, block_id, block_height
          from interactions
          WHERE sort_key = ''
            AND source = 'arweave'
          ORDER BY block_height ASC
          LIMIT 10000;
      `
    );

    if (result?.rows?.length == 0) {
      console.log('====== Arweave transactions done! ======');
      break;
    }

    for (const r of result.rows) {
      const sortKey = await sorter.createSortKey(r.block_id, r.interaction_id, r.block_height);
      console.log(`${r.id} : ${r.block_height} : ${r.interaction_id} = ${sortKey}`);
      await db('interactions').where({ id: r.id }).update({
        sort_key: sortKey,
      });
    }

    round++;
  }

  // update redstone sequencer transactions
  await db.raw(
    `
        UPDATE interactions
        SET sort_key = sequencer.sequence_sort_key
        FROM sequencer
        WHERE interactions.interaction_id = sequencer.sequence_transaction_id;
    `
  );
}

updateDb().catch((e) => console.error(e));
