import { fromPromise, of } from "hyper-async";
import {
  __,
  applySpec,
  assoc,
  compose,
  evolve,
  map,
  path,
  pipe,
  prop,
  reduce,
  transduce,
} from "ramda";
import { z } from "zod";
import { createData } from "warp-arbundles";
export { createData };

/**
 * An implementation of the Sequencer client using
 * the Warp Sequencer
 */

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} SEQUENCER_URL
 * @property {any} logger
 * @property {number} pageSize
 *
 * @typedef LoadInteractionsArgs
 * @property {string} id - the contract id
 * @property {string} from - the lower-most block height
 * @property {string} to - the upper-most block height
 *
 * @callback LoadInteractions
 * @param {LoadInteractionsArgs} args
 * @returns {Async<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {LoadInteractions}
 */
export function loadInteractionsWith(
  { fetch, SEQUENCER_URL, logger: _logger, pageSize },
) {
  // TODO: create a dataloader and use that to batch load interactions
  const logger = _logger.child("loadInteractions");
  /**
   * Some values are coming back from the sequencer as strings,
   * despite the values actually being numbers when pulled from the gateway
   *
   * We treat the Arweave gateway as the ultimate truth for data integrity,
   * so we will coerce those values to numbers, when encountered, using this schema
   */
  const stringfiedNumberSchema = z.coerce.number();

  const interactionsPageSchema = z.object({
    paging: z.record(z.any()),
    interactions: z.array(z.object({
      /**
       * The interaction coming from the sequencer is to used
       * to not only retrieve the interaction performed (via the 'Input' tag)
       *
       * but also to construct the SWGlobal object passed as the 3rd argument
       * to the Contract handle function
       *
       * @see {@link toSwGlobal} for mapping of sequencer interaction -> SWGlobal
       */
      interaction: z.object({
        id: z.string(),
        owner: z.object({
          address: z.string(),
        }),
        /**
         * This was sometimes null on the sequencer response,
         * so default to empty string
         */
        recipient: z.string().default(""),
        quantity: z.object({
          winston: stringfiedNumberSchema,
        }),
        fee: z.object({
          winston: stringfiedNumberSchema,
        }),
        tags: z.array(z.object({
          name: z.string(),
          value: z.string(),
        })),
        block: z.object({
          id: z.string(),
          height: stringfiedNumberSchema,
          timestamp: stringfiedNumberSchema,
        }),
        sortKey: z.string(),
      }),
    })),
  });

  /**
   * Pad the block height portion of the sortKey to 12 characters
   *
   * This should work to increment and properly pad any sort key:
   * - 000001257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (full Sequencer sort key)
   * - 000001257294,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (Smartweave protocol sort key)
   * - 1257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (missing padding)
   * - 1257294 (just block height)
   *
   * @param {string} sortKey - the sortKey to be padded. If the sortKey is of sufficient length, then no padding
   * is added.
   */
  const padBlockHeight = (sortKey) => {
    if (!sortKey) return sortKey;
    const [height, ...rest] = String(sortKey).split(",");
    return [height.padStart(12, "0"), ...rest].join(",");
  };

  const mapBounds = evolve({
    from: padBlockHeight,
    to: pipe(
      /**
       * Potentially add a comma to the end of the block height, so
       * the sequencer will include any interactions in that block
       */
      (sortKey) => {
        if (!sortKey) return sortKey;
        const parts = String(sortKey).split(",");
        /**
         * Full sort key, so no need to increment
         */
        if (parts.length > 1) return parts.join(",");

        /**
         * only the block height is being used as the sort key
         * so append a ',' so that transactions in that block are included
         */
        const [height] = parts;
        return `${height},`;
      },
      /**
       * Still ensure the proper padding is added
       */
      padBlockHeight,
    ),
  });

  /**
   * Reference shape pulled from
   * https://github.com/ArweaveTeam/SmartWeave/blob/master/CONTRACT-GUIDE.md#smartweave-global-api
   *
   * But without the function apis
   */
  const toSwGlobal = (interaction) => ({
    transaction: applySpec({
      id: path(["id"]),
      owner: path(["owner", "address"]),
      target: path(["recipient"]),
      quantity: path(["quantity", "winston"]),
      reward: path(["fee", "winston"]),
      tags: path(["tags"]),
    })(interaction),
    block: applySpec({
      height: path(["block", "height"]),
      indep_hash: path(["block", "id"]),
      timestamp: path(["block", "timestamp"]),
    })(interaction),
  });

  const fetchAllPages = ({ id, from, to }) => {
    async function fetchPage(page) {
      return Promise.resolve(page)
        .then(
          logger.tap(
            `Loading page of %s interactions for contract "%s" from "%s" to "%s" - page %s`,
            pageSize,
            id,
            from,
            to || "latest",
          ),
        )
        .then(() =>
          fetch(
            `${SEQUENCER_URL}/gateway/v2/interactions-sort-key?contractId=${id}&from=${from}&to=${to}&page=${page}&limit=${pageSize}`,
          )
        )
        .then((res) => res.json());
    }

    async function maybeFetchNext({ paging, interactions }) {
      /**
       * Either have reached the end and resolve, or fetch the next page and recurse
       */
      // deno-fmt-ignore-start
      return paging.page >= paging.pages ? { paging, interactions } : Promise.resolve(paging.page + 1)
        .then(fetchPage)
        .then(maybeFetchNext)
        .then(({ paging, interactions: i }) => ({ paging, interactions: interactions.concat(i) }))
      // deno-fmt-ignore-end
    }

    /**
     * Start with the first page, then keep going
     */
    return fetchPage(1).then(maybeFetchNext);
  };

  /**
   * See https://academy.warp.cc/docs/gateway/http/get/interactions
   * A couple quirks to highlight here:
   *
   * - The sequencer returns interactions sorted by block height, DESCENDING order
   *   so in order to fold interactions, chronologically, we need to reverse the order of interactions
   *   prior to returning (see unshift instead of push in trasducer below)
   *
   * - The block height included in both to and from need to be left padded with 0's to reach 12 characters (See https://academy.warp.cc/docs/sdk/advanced/bundled-interaction#how-it-works)
   *   (see padBlockHeight above or impl)
   *
   * - 'from' is inclusive
   *
   * - 'to' is non-inclusive IF only the block height is used at the sort key, so if we want to include interactions in the block at 'to', then we need to add a comma to the block height
   *    (see mapBounds above where we add the comma). I believe this is just because of the way the range query is implemented underneath the hood in Warp Sequencer
   */
  return (ctx) =>
    of({ id: ctx.id, from: ctx.from, to: ctx.to })
      .map(mapBounds)
      .chain(fromPromise(({ id, from, to }) =>
        fetchAllPages({ id, from, to })
          .then(interactionsPageSchema.parse)
          .then(prop("interactions"))
          .then((interactions) => {
            logger(
              `loaded %s interactions from sequencer for contract "%s" from "%s" to "%s"`,
              interactions.length,
              id,
              from,
              to || "latest",
            );
            return interactions;
          })
          .then((interactions) =>
            transduce(
              // { interaction: { ..., tags: [ { name, value }] } }
              compose(
                // [ { name, value } ]
                map(path(["interaction"])),
                /**
                 * Build the actual expected shape
                 * of an action
                 */
                map(applySpec({
                  sortKey: prop("sortKey"),
                  action: pipe(
                    path(["tags"]),
                    // { first: tag, second: tag }
                    reduce((a, t) => assoc(t.name, t.value, a), {}),
                    // "{\"function\": \"balance\"}"
                    prop("Input"),
                    // { function: "balance" }
                    (input) => JSON.parse(input),
                  ),
                  /**
                   * TODO: is this the right layer to be mapping this?
                   * Should it be done in BL, or is it the responsibility of the client?
                   *
                   * For now, we will keep it a responsibility of the client impl
                   */
                  SWGlobal: toSwGlobal,
                })),
              ),
              (acc, input) => {
                acc.unshift(input);
                return acc;
              },
              [],
              interactions,
            )
          )
      )).toPromise();
}

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
export function writeInteractionWith({ fetch, SEQUENCER_URL }) {
  return (transaction) => {
    return of(transaction)
      .chain(fromPromise(async (transaction) => {
        let dataItem = await transaction.signedData;
        const response = await fetch(
          `${SEQUENCER_URL}/gateway/v2/sequencer/register`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/octet-stream",
              Accept: "application/json",
            },
            body: dataItem.getRaw(),
          },
        );

        return {
          bundlrResponse: await getJsonResponse(response),
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
      `Error while communicating with gateway: ${JSON.stringify(e)}`,
    );
  }

  if (!r?.ok) {
    const text = await r.text();
    throw new Error(`${r.status}: ${text}`);
  }
  const result = await r.json();
  return result;
}
