import { of } from "hyper-async";

import { loadSourceWith } from "./lib/load-src.js";
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
 * 
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith({ fetch }) {
  return (contractId, sortKeyHeight) => {
    return of({ id: contractId })
      .chain(loadSourceWith({ fetch }))
      //.chain(loadInteractions)
      // evaluate and cache result
      // return result
      .toPromise();
  };
}
