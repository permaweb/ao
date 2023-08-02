import { GatewayContext } from './gateway/init';
import {
  ArweaveWrapper,
  Benchmark,
  GQLEdgeInterface,
  GQLResultInterface,
  GQLTransactionsResultInterface,
  WarpLogger,
} from 'warp-contracts';
import { sleep } from './utils';

export const MAX_GQL_REQUEST = 100;
const GQL_RETRY_MS = 30 * 1000;

export interface TagFilter {
  name: string;
  values: string[];
}

export interface BlockFilter {
  min?: number;
  max: number;
}

export interface ReqVariables {
  bundledIn?: string | null;
  tags: TagFilter[];
  blockFilter: BlockFilter;
  first: number;
  after?: string;
}

export interface GqlContext {
  logger: WarpLogger;
  arweaveWrapper: ArweaveWrapper;
}

function filterBundles(tx: GQLEdgeInterface) {
  return !tx.node.parent?.id && !tx.node.bundledIn?.id;
}

export async function loadPages(context: GqlContext, query: string, variables: any) {
  let transactions = await getNextPage(context, query, variables);

  const txInfos: GQLEdgeInterface[] = transactions.edges.filter((tx) => filterBundles(tx));

  const { logger } = context;

  while (transactions.pageInfo.hasNextPage) {
    const cursor = transactions.edges[MAX_GQL_REQUEST - 1].cursor;
    logger.debug(`Cursor for ${transactions.edges[MAX_GQL_REQUEST - 1].node.id}[${transactions.edges[MAX_GQL_REQUEST - 1].node.block.height}]: ${transactions.edges[MAX_GQL_REQUEST - 1].cursor}`);

    variables = {
      ...variables,
      after: cursor,
    };

    transactions = await getNextPage(context, query, variables);

    txInfos.push(...transactions.edges.filter((tx) => filterBundles(tx)));
  }
  return txInfos;
}

export async function getNextPage(
  context: GqlContext,
  query: string,
  variables: any
): Promise<GQLTransactionsResultInterface> {
  const { logger, arweaveWrapper } = context;

  const benchmark = Benchmark.measure();
  logger.debug('GQL Variables', JSON.stringify(variables));
  let response = await arweaveWrapper.gql(query, variables);
  logger.debug('GQL page load:', benchmark.elapsed());

  while (response.status === 403) {
    logger.warn(`GQL rate limiting, waiting ${GQL_RETRY_MS}ms before next try.`);

    await sleep(GQL_RETRY_MS);

    response = await arweaveWrapper.gql(query, variables);
  }

  if (response.status !== 200) {
    throw new Error(`Unable to retrieve transactions. Arweave gateway responded with status ${response.status}.`);
  }

  if (response.data.errors) {
    logger.error(response.data.errors);
    throw new Error('Error while loading interaction transactions');
  }

  const data: GQLResultInterface = response.data;

  return data.data.transactions;
}
