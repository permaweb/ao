import { of } from 'hyper-async'
import { loadSource } from './lib/load-src.js'
/**
 * @typedef ContractResult
 * @property {any} State
 * @property {any} Result
 */

/**
 * @param {string} contractId
 * @param {string} sortKeyHeight
 * @returns {ContractResult} result
 */
export function readState(contractId, sortKeyHeight) {
  return of({ id: contractId })
    .chain(loadSource)
    .toPromise()
    //.chain(loadInteractions)
  // evaluate 
  // store result
  // return result
  return {}
}