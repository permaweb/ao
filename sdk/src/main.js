import { of, Resolved } from "hyper-async";

import { loadTransactionDataWith, loadTransactionMetaWith } from "./dal.js";
import { loadSourceWith } from "./lib/load-src.js";
import { loadStateWith } from "./lib/load-state.js";

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
  /**
   * build dal, injecting bottom lvl deps
   */
  const loadTransactionMeta = loadTransactionMetaWith({ fetch, GATEWAY_URL });
  const loadTransactionData = loadTransactionDataWith({ fetch, GATEWAY_URL });
  const db = {
    // TODO: implement to fetch from PouchDB. Mock for now
    findLatestInteraction: ({ id, to }) => {
      return Resolved({
        _id: "",
        parent: id,
        type: "interaction",
        input: {},
        resultantState: {},
      });
    },
  };

  /**
   * build the domain, injecting various dal deps as the env
   */
  const env = { loadTransactionMeta, loadTransactionData, db };
  const loadSource = loadSourceWith(env);
  const loadState = loadStateWith(env);

  return (contractId, sortKeyHeight) => {
    return of({ id: contractId, to: sortKeyHeight })
      .chain(loadSource)
      .chain(loadState)
      //.chain(loadInteractions)
      // evaluate and cache result
      // return result
      .toPromise();
  };
}
