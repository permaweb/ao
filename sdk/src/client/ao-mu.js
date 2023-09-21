
import { fromPromise, of } from "hyper-async";

import { createData } from "warp-arbundles";
export { createData };


/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} SEQUENCER_URL
 *
 * @typedef WriteInteractionTx
 * @property { any } signedData - DataItem returned from arbundles createData
 *
 * @typedef WriteInteraction2Args
 * @property {WriteInteractionTx} transaction - the contract id
 *
 * @callback WriteInteraction2
 * @param {WriteInteraction2Args} args
 * @returns {Async<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {WriteInteraction2}
 */
export function writeInteractionWith({ fetch, MU_URL, CU_URL }) {
    return (transaction) => {
      return of(transaction)
        .chain(fromPromise(async (transaction) => {
          let dataItem = await transaction.signedData;
          
          const response = await fetch(
            `${MU_URL}/write`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                body: JSON.stringify({
                    id: await dataItem.id,
                    data: dataItem.getRaw(),
                    cu: CU_URL
                }),
            }
        );        
  
          return {
            muResponse: await getJsonResponse(response),
            originalTxId: await dataItem.id,
          };
        })).toPromise();
    };
}


/**
 * @typedef Env4
 * @property {any} createDataItem
 *
 * @typedef Tag
 * @property {string} name
 * @property {any} value
 *
 * @typedef SignInteractionArgs
 * @property {any} data
 * @property {Tag[]} tags
 *
 * @callback SignInteraction
 * @param {SignInteractionArgs} args
 * @returns {Async<Record<string, any>}
 *
 * @param {Env4} env
 * @returns {SignInteraction}
 */
export function signInteractionWith({ createDataItem }) {
    return (transaction) => {
      return of(transaction)
        .chain(fromPromise(async (transaction) => {
          const { data, tags, wallet } = transaction;
          /**
           * if in the browser the user must pass
           *   - warp-contracts-plugin-signature InjectedArweaveSigner as wallet
           * if in node.js the user must pass
           *   - warp-arbundles ArweaveSigner as wallet
           *
           * TODO: this is temporary until we can rebuild the signature piece
           */
          let interactionDataItem;
          if (isBrowser() && wallet.signer?.signDataItem) {
            interactionDataItem = await wallet.signDataItem(data, tags);
          } else {
            interactionDataItem = createDataItem(data, wallet, { tags: tags });
            await interactionDataItem.sign(wallet);
          }
  
          return interactionDataItem;
        })).toPromise();
    };
}
  
  /**
   * some utilities used by the above functions pulled from warp sdk
   */
const isBrowser = new Function(
    "try {return this===window;}catch(e){ return false;}",
);
  
export async function getJsonResponse(response) {
    let r;
    try {
      r = await response;
    } catch (e) {
      throw new Error(
        `Error while communicating with messenger: ${JSON.stringify(e)}`,
      );
    }
  
    if (!r?.ok) {
      const text = await r.text();
      throw new Error(`${r.status}: ${text}`);
    }
    const result = await r.json();
    return result;
}
  