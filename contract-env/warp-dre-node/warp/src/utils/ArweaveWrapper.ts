import Arweave from 'arweave';
import { Buffer as isomorphicBuffer } from 'warp-isomorphic';
import { LoggerFactory } from '../logging/LoggerFactory';
import { BlockData, NetworkInfoInterface, Transaction } from './types/arweave-types';
import { Warp } from '../core/Warp';
import { getJsonResponse, stripTrailingSlash } from './utils';

export class ArweaveWrapper {
  private readonly logger = LoggerFactory.INST.create('ArweaveWrapper');

  private readonly baseUrl;

  constructor(private readonly warp: Warp) {
    const { arweave } = warp;
    this.baseUrl = `${arweave.api.config.protocol}://${arweave.api.config.host}:${arweave.api.config.port}`;
    this.logger.debug('baseurl', this.baseUrl);
  }

  async warpGwInfo(): Promise<NetworkInfoInterface> {
    return await this.doFetchInfo<NetworkInfoInterface>(
      `${stripTrailingSlash(this.warp.gwUrl())}/gateway/arweave/info`
    );
  }

  async warpGwBlock(): Promise<BlockData> {
    this.logger.debug('Calling warp gw block info');
    return await this.doFetchInfo<BlockData>(`${stripTrailingSlash(this.warp.gwUrl())}/gateway/arweave/block`);
  }

  async info(): Promise<NetworkInfoInterface> {
    return await this.doFetchInfo<NetworkInfoInterface>(`${this.baseUrl}/info`);
  }

  /**
   *
   * @param query graphql query string
   * @param variables variables depends on provided query
   * @returns axios-like (for backwards compatibility..) response from graphql
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async gql(query: string, variables: unknown): Promise<{ data: any; status: number }> {
    try {
      const data = JSON.stringify({
        query: query,
        variables: variables
      });

      const response = await getJsonResponse(
        fetch(`${this.baseUrl}/graphql`, {
          method: 'POST',
          body: data,
          headers: {
            'Accept-Encoding': 'gzip, deflate, br',
            'Content-Type': 'application/json',
            Accept: 'application/json'
          }
        })
      );

      return {
        data: response,
        status: 200
      };
    } catch (e) {
      this.logger.error('Error while loading gql', e);
      throw e;
    }
  }

  async tx(id: string): Promise<Transaction> {
    const response = await fetch(`${this.baseUrl}/tx/${id}`)
      .then((res) => {
        return res.ok ? res.json() : Promise.reject(res);
      })
      .catch((error) => {
        if (error.body?.message) {
          this.logger.error(error.body.message);
        }
        throw new Error(`Unable to retrieve tx ${id}. ${error.status}. ${error.body?.message}`);
      });

    return new Transaction({
      ...response
    });
  }

  async txData(id: string): Promise<Buffer> {
    // note: this is using arweave.net cache -
    // not very safe and clever, but fast...
    const response = await fetch(`${this.baseUrl}/${id}`);
    if (!response.ok) {
      this.logger.warn(`Unable to load data from arweave.net/${id} endpoint, falling back to arweave.js`);
      // fallback to arweave-js as a last resort..
      const txData = (await this.warp.arweave.transactions.getData(id, {
        decode: true
      })) as Uint8Array;
      return isomorphicBuffer.from(txData);
    } else {
      const buffer = await response.arrayBuffer();
      return isomorphicBuffer.from(buffer);
    }
  }

  async txDataString(id: string): Promise<string> {
    const buffer = await this.txData(id);
    return Arweave.utils.bufferToString(buffer);
  }

  private async doFetchInfo<R>(url: string): Promise<R> {
    return await getJsonResponse<R>(fetch(url));
  }
}
