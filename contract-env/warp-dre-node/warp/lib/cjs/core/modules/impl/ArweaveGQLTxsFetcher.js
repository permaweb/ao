"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArweaveGQLTxsFetcher = void 0;
const LoggerFactory_1 = require("../../../logging/LoggerFactory");
const ArweaveWrapper_1 = require("../../../utils/ArweaveWrapper");
const utils_1 = require("../../../utils/utils");
const Benchmark_1 = require("../../../logging/Benchmark");
const TRANSACTIONS_QUERY = `query Transactions($tags: [TagFilter!]!, $blockFilter: BlockFilter!, $first: Int!, $after: String) {
    transactions(tags: $tags, block: $blockFilter, first: $first, sort: HEIGHT_ASC, after: $after) {
      pageInfo {
        hasNextPage
      }
      edges {
        node {
          id
          owner { address }
          recipient
          tags {
            name
            value
          }
          block {
            height
            id
            timestamp
          }
          fee { winston }
          quantity { winston }
          parent { id }
          bundledIn { id }
        }
        cursor
      }
    }
  }`;
const TRANSACTION_QUERY = `query Transaction($id: ID!) {
  transaction(id: $id) {
          id
          owner { address, key }
          recipient
          tags {
            name
            value
          }
          block {
            height
            id
            timestamp
          }
          fee { winston, ar }
          quantity { winston, ar }
          bundledIn { id }
    			parent{ id }
          signature
        }
}`;
const RETRY_TIMEOUT = 30 * 1000;
const MAX_REQUEST = 100;
/**
 * Query all transactions from arweave gateway
 */
class ArweaveGQLTxsFetcher {
    constructor(warp) {
        this.warp = warp;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create(ArweaveGQLTxsFetcher.name);
        this.arweaveWrapper = new ArweaveWrapper_1.ArweaveWrapper(warp);
    }
    async transaction(transactionId) {
        const response = await this.fetch(TRANSACTION_QUERY, { id: transactionId });
        return response.transaction;
    }
    async transactions(variables) {
        let pageResult = (await this.fetch(TRANSACTIONS_QUERY, variables)).transactions;
        const edges = [...pageResult.edges];
        while (pageResult.pageInfo.hasNextPage) {
            const cursor = pageResult.edges[MAX_REQUEST - 1].cursor;
            const newVariables = {
                ...variables,
                after: cursor
            };
            pageResult = (await this.fetch(TRANSACTIONS_QUERY, newVariables)).transactions;
            edges.push(...pageResult.edges);
        }
        return edges;
    }
    async fetch(gqlQuery, variables) {
        const benchmark = Benchmark_1.Benchmark.measure();
        let response = await this.arweaveWrapper.gql(gqlQuery, variables);
        this.logger.debug('GQL page load:', benchmark.elapsed());
        while (response.status === 403) {
            this.logger.warn(`GQL rate limiting, waiting ${RETRY_TIMEOUT}ms before next try.`);
            await (0, utils_1.sleep)(RETRY_TIMEOUT);
            response = await this.arweaveWrapper.gql(gqlQuery, variables);
        }
        if (response.status !== 200) {
            throw new Error(`Unable to retrieve transactions. Arweave gateway responded with status ${response.status}.`);
        }
        if (response.data.errors) {
            this.logger.error(response.data.errors);
            throw new Error('Error while fetching arweave transactions');
        }
        return response.data.data;
    }
}
exports.ArweaveGQLTxsFetcher = ArweaveGQLTxsFetcher;
//# sourceMappingURL=ArweaveGQLTxsFetcher.js.map