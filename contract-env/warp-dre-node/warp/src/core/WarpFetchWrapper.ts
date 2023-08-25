import { LoggerFactory } from '../logging/LoggerFactory';
import { Warp } from './Warp';

export interface FetchRequest {
  input: RequestInfo | URL;
  init: Partial<RequestInit>;
}

export class WarpFetchWrapper {
  private readonly name = 'WarpFetchWrapper';
  private readonly logger = LoggerFactory.INST.create(this.name);

  constructor(private warp: Warp) {
    this.warp = warp;
  }

  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    let fetchOptions: RequestInit;

    if (this.warp.hasPlugin('fetch-options')) {
      const fetchOptionsPlugin = this.warp.loadPlugin<FetchRequest, Partial<RequestInit>>('fetch-options');
      try {
        const updatedFetchOptions = fetchOptionsPlugin.process({ input, init: init || {} });
        fetchOptions = { ...init, ...updatedFetchOptions };
      } catch (e) {
        if (e.message) {
          this.logger.error(e.message);
        }
        throw new Error(`Unable to process fetch options: ${e.message}`);
      }
    } else {
      fetchOptions = init;
    }

    return fetch(input, fetchOptions);
  }
}
