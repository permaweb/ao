import { TaskRunner } from './TaskRunner';
import { GatewayContext } from '../init';
import { ContractDefinition, ContractDefinitionLoader, GQLEdgeInterface, SmartWeaveTags } from 'warp-contracts';
import { loadPages, MAX_GQL_REQUEST, ReqVariables } from '../../gql';
import { FIRST_SW_TX_BLOCK_HEIGHT, MAX_BATCH_INSERT, testnetVersion } from './syncTransactions';
import { getCachedNetworkData } from './networkInfoCache';
import { publishContract, sendNotification } from '../publisher';
import { DatabaseSource } from '../../db/databaseSource';
import { ContractInsert } from '../../db/insertInterfaces';
import fs from 'fs';

const CONTRACTS_METADATA_INTERVAL_MS = 10000;

const CONTRACTS_QUERY = `query Transactions($tags: [TagFilter!]!, $blockFilter: BlockFilter!, $first: Int!, $after: String) {
    transactions(tags: $tags, block: $blockFilter, first: $first, sort: HEIGHT_ASC, after: $after) {
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
          block {
            height
            timestamp
          }
          parent { id }
          bundledIn { id }
        }
        cursor
      }
    }
  }`;

export async function runContractsMetadataTask(context: GatewayContext) {
  await TaskRunner.from('[contracts metadata]', loadContractsMetadata, context).runSyncEvery(
    CONTRACTS_METADATA_INTERVAL_MS
  );
}

export async function runLoadContractsFromGqlTask(context: GatewayContext) {
  await TaskRunner.from('[contracts from gql]', loadContractsFromGql, context).runSyncEvery(
    CONTRACTS_METADATA_INTERVAL_MS
  );
}

async function loadContractsFromGql(context: GatewayContext) {
  const { logger, dbSource } = context;

  let lastProcessedBlockHeight;
  if (fs.existsSync('contracts-sync-l1.json')) {
    const data = JSON.parse(fs.readFileSync('contracts-sync-l1.json', 'utf-8'));
    lastProcessedBlockHeight = data?.lastProcessedBlockHeight;
  } else {
    let result: any;
    try {
      result = await dbSource.selectLastContract();
      lastProcessedBlockHeight = result?.block_height;
    } catch (e: any) {
      logger.error('Error while checking new blocks', e.message);
      return;
    }
  }

  const currentNetworkHeight = getCachedNetworkData().cachedNetworkInfo.height;
  lastProcessedBlockHeight = lastProcessedBlockHeight || FIRST_SW_TX_BLOCK_HEIGHT;
  const from = lastProcessedBlockHeight - 1;
  const to = currentNetworkHeight - from <= 100 ? currentNetworkHeight : from + 100;
  logger.info('Loading L1 contracts', {
    from,
    to,
  });

  let transactions: GQLEdgeInterface[];
  try {
    transactions = await load(context, from, to);
  } catch (e: any) {
    logger.error('Error while loading contracts', e.message);
    return;
  }

  if (transactions.length === 0) {
    logger.info('No new contracts');
    fs.writeFileSync('contracts-sync-l1.json', JSON.stringify({ lastProcessedBlockHeight: to }), 'utf-8');
    return;
  }

  logger.info(`Found ${transactions.length} contracts`);

  let contractsInserts: Partial<ContractInsert>[] = [];

  const contractsInsertsIds = new Set<string>();
  for (let transaction of transactions) {
    const contractId = transaction.node.id;
    if (!contractsInsertsIds.has(contractId)) {
      const contentType = getContentTypeTag(transaction);
      const testnet = testnetVersion(transaction);
      if (!contentType) {
        logger.warn(`Cannot determine contract content type for contract ${contractId}`);
      }
      contractsInserts.push({
        contract_id: transaction.node.id,
        block_height: transaction.node.block.height,
        block_timestamp: transaction.node.block.timestamp,
        content_type: contentType || 'unknown',
        deployment_type: 'arweave',
        testnet,
        sync_timestamp: Date.now(),
      });
      contractsInsertsIds.add(contractId);

      if (contractsInserts.length === MAX_BATCH_INSERT) {
        try {
          logger.info(`Batch insert ${MAX_BATCH_INSERT} interactions.`);
          await insertContracts(dbSource, contractsInserts);
          contractsInserts = [];
        } catch (e) {
          logger.error(e);
          return;
        }
      }
    }
  }

  logger.info(`Saving last`, contractsInserts.length);

  if (contractsInserts.length > 0) {
    try {
      await insertContracts(dbSource, contractsInserts);
    } catch (e) {
      logger.error(e);
      return;
    } finally {
      fs.writeFileSync('contracts-sync-l1.json', JSON.stringify({ lastProcessedBlockHeight: to }), 'utf-8');
    }
  } else {
    fs.writeFileSync('contracts-sync-l1.json', JSON.stringify({ lastProcessedBlockHeight: to }), 'utf-8');
  }

  logger.info(`Inserted ${contractsInserts.length} contracts`);
}

async function insertContracts(dbSource: DatabaseSource, contractsInserts: any[]) {
  await dbSource.insertContractsMetadata(contractsInserts);
}

function getContentTypeTag(interactionTransaction: GQLEdgeInterface): string | undefined {
  return interactionTransaction.node.tags.find((tag) => tag.name === SmartWeaveTags.CONTENT_TYPE)?.value;
}

async function load(context: GatewayContext, from: number, to: number): Promise<GQLEdgeInterface[]> {
  const variables: ReqVariables = {
    bundledIn: null,
    tags: [
      {
        name: SmartWeaveTags.APP_NAME,
        values: ['SmartWeaveContract'],
      },
    ],
    blockFilter: {
      min: from,
      max: to,
    },
    first: MAX_GQL_REQUEST,
  };

  const { logger, arweaveWrapperGqlGoldsky } = context;
  return await loadPages({ logger, arweaveWrapper: arweaveWrapperGqlGoldsky }, CONTRACTS_QUERY, variables);
}

async function loadContractsMetadata(context: GatewayContext) {
  const { arweave, logger, dbSource, arweaveWrapper } = context;
  const definitionLoader = new ContractDefinitionLoader(arweave, 'mainnet');

  const result: {
    contract: string;
    blockHeight: number;
    blockTimestamp: number;
    syncTimestamp: number;
    testnet: string;
  }[] = (
    await dbSource.raw(
      `
        SELECT  contract_id AS contract,
                block_height AS blockHeight,
                block_timestamp AS blockTimestamp,
                sync_timestamp AS syncTimestamp,
                testnet AS testnet
        FROM contracts
        WHERE contract_id != ''
          AND contract_id NOT ILIKE '()%'
          AND src_tx_id IS NULL
          AND type IS NULL;
    `
    )
  ).rows;

  const missing = result?.length || 0;
  logger.info(`Loading ${missing} contract definitions.`);

  if (missing == 0) {
    return;
  }

  for (const row of result) {
    logger.debug(`Loading ${row.contract} definition.`);
    try {
      const contractId = row.contract.trim();
      const definition: ContractDefinition<any> = await definitionLoader.load(contractId);
      const type = evalType(definition.initState);
      const srcTxOwner = await arweave.wallets.ownerToAddress(definition.srcTx.owner);

      let update: any = {
        src_tx_id: definition.srcTxId,
        init_state: definition.initState,
        owner: definition.owner,
        type,
        pst_ticker: type == 'pst' ? definition.initState?.ticker : null,
        pst_name: type == 'pst' ? definition.initState?.name : null,
        contract_tx: { tags: definition.contractTx.tags },
      };

      let contracts_src_insert: any = {
        src_tx_id: definition.srcTxId,
        owner: srcTxOwner,
        src_content_type: definition.contractType == 'js' ? 'application/javascript' : 'application/wasm',
        src_tx: definition.srcTx,
        deployment_type: 'arweave',
      };

      if (definition.contractType == 'js') {
        contracts_src_insert = {
          ...contracts_src_insert,
          src: definition.src,
        };
      } else {
        const rawTxData = await arweaveWrapper.txData(definition.srcTxId);
        contracts_src_insert = {
          ...contracts_src_insert,
          src_binary: rawTxData,
          src_wasm_lang: definition.srcWasmLang,
        };
      }

      logger.debug(`Inserting ${row.contract} metadata into db`);
      await dbSource.updateContractMetadata(definition.txId, update);

      await dbSource.updateContractSrc(contracts_src_insert);

      // TODO: add tags to ContractDefinition type in the SDK
      sendNotification(context, definition.txId, { initState: definition.initState, tags: [] });
      publishContract(
        context,
        contractId,
        definition.owner,
        type,
        row.blockHeight,
        row.blockTimestamp,
        'arweave',
        row.syncTimestamp,
        row.testnet
      );

      logger.debug(`${row.contract} metadata inserted into db`);
    } catch (e) {
      logger.error(`Error while loading contract ${row.contract} definition`, e);
      await dbSource.updateContractError(row);
    }
  }
}

export function evalType(initState: any): string {
  if (initState.ticker && initState.balances) {
    return 'pst';
  }

  return 'other';
}
