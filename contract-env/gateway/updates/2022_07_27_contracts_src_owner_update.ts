/* eslint-disable */
import { connect } from '../src/db/connect';
import Arweave from 'arweave';
import { Benchmark, ArweaveWrapper, GQLEdgeInterface, LoggerFactory } from 'warp-contracts';
import { GqlContext, loadPages } from '../src/gql';
import { sleep } from '../src/utils';
async function updateContractsSourceWithOwner() {
  require('dotenv').config({
    path: '.secrets/local.env',
  });

  const CONTRACTS_SRC_QUERY = `query Transactions($ids: [ID!]!) {
    transactions(ids: $ids) {
        pageInfo {
            hasNextPage
        }
        edges {
            node {
                id
                owner { 
                    address
                }
                tags {
                    name
                    value
                }
            }
        }
    }
  }`;

  const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    timeout: 20000,
    logging: false,
  });

  const db = connect();

  const benchmark = Benchmark.measure();

  const arweaveWrapper = new ArweaveWrapper(arweave);

  const logger = LoggerFactory.INST.create('contracts src owner');

  const context = {
    logger,
    arweaveWrapper,
  };

  while (true) {
    const contractsSrc: any = await db.raw(
      `   
      SELECT src_tx_id, bundler_src_tx_id 
      FROM contracts_src 
      WHERE owner IS NULL
      LIMIT 10;
        `
    );
    if (contractsSrc?.rows?.length == 0) {
      console.log('====== Contracts source updated! ======');
      break;
    }

    // to make Arweave gateway happy
    await sleep(5000);

    const res: any = await Promise.allSettled(
      contractsSrc.rows.map(async (r: any) => {
        return await load(context, r.bundler_src_tx_id ? r.bundler_src_tx_id : r.src_tx_id, CONTRACTS_SRC_QUERY);
      })
    );
    const resFulfilled = res.filter((r: any) => r.status == 'fulfilled');
    let values = '';
    let updateTemplate = (values: string) =>
      `
            UPDATE contracts_src 
            SET owner = tmp.owner
            FROM (VALUES ${values}) AS tmp (src_tx_id, owner) 
            WHERE contracts_src.src_tx_id = tmp.src_tx_id;  
        `;
    let valuesCounter = 0;

    const batchSize = resFulfilled.length;

    console.log('Batch size: ', batchSize ? batchSize : 'Batch empty this time...');
    for (const r of resFulfilled) {
      const owner = r.value[0]
        ? r.value[0].node.tags.find((t: any) => t.name == 'Uploader-Contract-Owner')?.value ||
          r.value[0].node.owner.address
        : 'error';
      console.log(
        `Source tx id: ${r.value[0] ? r.value[0].node.id : contractsSrc.rows[valuesCounter].src_tx_id}, owner: ${owner}`
      );
      values += `('${
        r.value[0]
          ? r.value[0].node.tags.find((t: any) => t.name == 'Uploader-Tx-Id')?.value || r.value[0].node.id
          : contractsSrc.rows[valuesCounter].src_tx_id
      }', '${owner}')`;
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

  console.log(`All sources updated with owner in ${benchmark.elapsed()}.`);
  process.exit(0);
}

updateContractsSourceWithOwner().catch((e) => console.error(e));

async function load(context: GqlContext, id: string, query: any): Promise<GQLEdgeInterface[]> {
  const mainTransactionsVariables = {
    ids: [id],
  };
  return await loadPages(context, query, mainTransactionsVariables);
}
