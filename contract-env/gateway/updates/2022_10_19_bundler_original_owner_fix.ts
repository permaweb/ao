/* eslint-disable */
import { connect } from '../src/db/connect';
import Arweave from 'arweave';

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

  const result: any = await db.raw(
    `
    select * from sequencer where original_address = '';
      `
  );

  console.log(`Loading ${result.rows.length} invalid txs.`);

  for (const r of result.rows) {
    const originalAdress = await arweave.wallets.ownerToAddress(r.original_owner);
    const invalidTx = await db.raw(
      `
    select interaction from interactions where bundler_tx_id = ?
    `,
      r.bundler_tx_id
    );
    const interaction = invalidTx.rows[0].interaction;
    const newInteraction = Object.assign({}, interaction, {
      owner: Object.assign({}, interaction.owner, {
        address: originalAdress,
      }),
    });
    console.log(newInteraction);

    await db.raw(
      `
    update interactions set interaction = ? where bundler_tx_id = ?;
    `,
      [newInteraction, r.bundler_tx_id]
    );
    await db.raw(
      `
      update sequencer set original_address = ? where bundler_tx_id = ?;
      `,
      [originalAdress, r.bundler_tx_id]
    );
  }

  console.log('Owner has been set for all invalid txs.')
  process.exit(0);
}

updateDb().catch((e) => console.error(e));
