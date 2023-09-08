import { of, Resolved } from "hyper-async";

import {
  loadInteractionsWith,
  loadTransactionDataWith,
  loadTransactionMetaWith,
} from "./dal.js";
import { loadSourceWith } from "./lib/load-src.js";
import { loadStateWith } from "./lib/load-state.js";
import { loadActionsWith } from "./lib/load-actions.js";

/**
 * @typedef ContractResult
 * @property {any} State
 * @property {any} Result
 *
 * @callback ReadState
 * @param {string} contractId
 * @param {string} sortKeyHeight
 * @returns {Promise<ContractResult>} result
 */

/**
 * @typedef Env
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 * @property {string} SEQUENCER_URL
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith({ fetch, GATEWAY_URL, SEQUENCER_URL }) {
  /**
   * build dal, injecting bottom lvl deps
   */
  const loadTransactionMeta = loadTransactionMetaWith({ fetch, GATEWAY_URL });
  const loadTransactionData = loadTransactionDataWith({ fetch, GATEWAY_URL });
  const loadInteractions = loadInteractionsWith({ fetch, SEQUENCER_URL });
  const db = {
    // TODO: implement to fetch from PouchDB. Mock for now
    findLatestInteraction: ({ id, to }) => {
      return Resolved(undefined);
    },
  };

  /**
   * build the domain, injecting various dal deps as the env
   */
  const env = {
    loadTransactionMeta,
    loadTransactionData,
    loadInteractions,
    db,
  };
  const loadSource = loadSourceWith(env);
  const loadState = loadStateWith(env);
  const loadActions = loadActionsWith(env);

  return (contractId, sortKeyHeight) => {
    return of({ id: contractId, to: sortKeyHeight })
      .chain(loadSource)
      .chain(loadState)
      .chain(loadActions)
      // evaluate and cache result
      // return result
      .toPromise();
  };
}
