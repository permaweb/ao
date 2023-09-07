import { of } from "hyper-async";

import { loadTransactionDataWith, loadTransactionMetaWith } from "./dal.js";
import { loadSourceWith } from "./lib/load-src.js";
import { loadInitialStateWith } from "./lib/load-state.js";

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
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith({ fetch, GATEWAY_URL }) {
  const loadTransactionMeta = loadTransactionMetaWith({ fetch, GATEWAY_URL });
  const loadTransactionData = loadTransactionDataWith({ fetch, GATEWAY_URL });

  const loadSource = loadSourceWith({
    loadTransactionMeta,
    loadTransactionData,
  });
  const loadInitialState = loadInitialStateWith({
    loadTransactionMeta,
    loadTransactionData,
  });

  return (contractId, sortKeyHeight) => {
    return of({ id: contractId })
      .chain(loadSource)
      .chain(loadInitialState)
      //.chain(loadInteractions)
      // evaluate and cache result
      // return result
      .toPromise();
  };
}
