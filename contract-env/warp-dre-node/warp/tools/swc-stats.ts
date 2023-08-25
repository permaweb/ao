/* eslint-disable */
import {
  ArweaveGatewayInteractionsLoader,
  DefaultEvaluationOptions,
  GQLEdgeInterface,
  GQLResultInterface,
  GQLTransactionsResultInterface,
  LoggerFactory
} from '@warp';
import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';
import { TsLogFactory } from '../src/logging/node/TsLogFactory';
import Transaction from 'arweave/node/lib/transaction';
import ArweaveWrapper from '../src/utils/ArweaveWrapper';
import knex from 'knex';

// max number of results returned from single query.
// If set more, arweave.net/graphql will still limit to 100 (not sure if that's a bug or feature).
const MAX_RESULTS_PER_PAGE = 100;

const transactionsQuery = `
query Transactions($tags: [TagFilter!]!, $after: String) {
    transactions(tags: $tags, first: 100,  sort: HEIGHT_ASC, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          tags {
            name
            value
          }
        }
        cursor
      }
    }
  }`;

async function main() {
  const db = knex({
    client: 'pg',
    connection: 'postgresql://postgres:@localhost:5432/stats',
    useNullAsDefault: true,
    pool: {
      min: 5,
      max: 30,
      createTimeoutMillis: 3000,
      acquireTimeoutMillis: 30000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
      propagateCreateError: false
    }
  });

  if (!(await db.schema.hasTable('transactions'))) {
    await db.schema.createTable('transactions', (table) => {
      table.string('id', 64).notNullable().index();
    });

    await db.schema.createTable('tags', (table) => {
      table.string('transaction_id', 64).notNullable().index();
      table.string('name').notNullable().index();
      table.text('value').notNullable().index();
    });
  }

  const arweave = Arweave.init({
    host: 'arweave.net', // Hostname or IP address for a Arweave host
    port: 443, // Port
    protocol: 'https', // Network protocol http or https
    timeout: 60000, // Network request timeouts in milliseconds
    logging: false // Enable network request logging
  });

  /*const contractTxs = await sendQuery(
    arweave,
    {
      tags: [
        {
          name: 'App-Name',
          values: ['SmartWeaveContract']
        }
      ],
      after: undefined
    },
    transactionsQuery
  );*/

  /**
   select ts.value as "Content-Type", count(ts.value) as Amount
   from transactions t
   join tags ts on ts.transaction_id = t.id
   where ts.name = 'Content-Type'
   group by ts.value
   order by count(ts.value) desc;
   */

  const file = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', `swc-stats.json`), 'utf-8'));
  console.log(`Checking ${file.length} contracts`);

  for (let row of file) {
    console.log('inserting', row.node.id);
    await db('transactions').insert({
      id: row.node.id
    });
    for (let tag of row.node.tags) {
      await db('tags').insert({
        transaction_id: row.node.id,
        name: tag.name,
        value: tag.value
      });
    }
  }
}

main().then(() => {
  console.log('done');
});

async function sendQuery(arweave: Arweave, variables: any, query: string) {
  let transactions: GQLTransactionsResultInterface | null = await getNextPage(arweave, variables, query);

  const txs: GQLEdgeInterface[] = transactions.edges.filter((tx) => !tx.node.parent || !tx.node.parent.id);

  while (transactions.pageInfo.hasNextPage) {
    const cursor = transactions.edges[MAX_RESULTS_PER_PAGE - 1].cursor;

    variables = {
      ...variables,
      after: cursor
    };

    transactions = await getNextPage(arweave, variables, query);
    txs.push(...transactions.edges.filter((tx) => !tx.node.parent || !tx.node.parent.id));
  }

  return txs;
}

async function getNextPage(arweave, variables, query: string): Promise<GQLTransactionsResultInterface | null> {
  console.log('loading page after', variables.after);

  const wrapper = new ArweaveWrapper(arweave);
  const response = await wrapper.gql(query, variables); /*await arweave.api.post('graphql', {
    query,
    variables
  });*/

  if (response.status !== 200) {
    console.error(response);
    throw new Error(`Wrong response status from Arweave: ${response.status}`);
  }

  if (response.data.errors) {
    console.error(response.data.errors);
    throw new Error('Error while loading transactions');
  }

  const data: GQLResultInterface = response.data;

  return data.data.transactions;
}
