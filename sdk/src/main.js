import { fromPromise, of } from "hyper-async";
import { z } from "zod";

import {
  dbClientSchema,
  loadTransactionDataWith,
  loadTransactionMetaWith,
  sequencerClientSchema,
} from "./dal.js";

// readState
import { loadSourceWith } from "./lib/readState/load-src.js";
import { loadStateWith } from "./lib/readState/load-state.js";
import { loadActionsWith } from "./lib/readState/load-actions.js";
import { evaluateWith } from "./lib/readState/evaluate.js";

// writeInteraction
import { verifyContractWith } from "./lib/writeInteraction/verify-contract.js";
import { verifyInputWith } from "./lib/writeInteraction/verify-input.js";
import { buildTxWith } from "./lib/writeInteraction/build-tx.js";

/**
 * @typedef Env
 * @property {fetch} fetch
 * @property {string} GATEWAY_URL
 * @property {z.infer<typeof sequencerClientSchema>} sequencer
 * @property {z.infer<typeof dbClientSchema>} db
 *
 * @typedef ContractResult
 * @property {any} state
 * @property {any} result
 *
 * @callback ReadState
 * @param {string} contractId
 * @param {string} sortKeyHeight
 * @returns {Promise<ContractResult>} result
 *
 * @param {Env} - the environment
 * @returns {ReadState}
 */
export function readStateWith({ fetch, GATEWAY_URL, sequencer, db }) {
  /**
   * build dal, injecting bottom lvl deps
   */
  const loadTransactionMeta = loadTransactionMetaWith({ fetch, GATEWAY_URL });
  const loadTransactionData = loadTransactionDataWith({ fetch, GATEWAY_URL });

  /**
   * build the domain, injecting various dal deps as the env
   */
  const env = {
    loadTransactionMeta,
    loadTransactionData,
    loadInteractions: fromPromise(sequencer.loadInteractions),
    db: {
      findLatestInteraction: fromPromise(db.findLatestInteraction),
      saveInteraction: fromPromise(db.saveInteraction),
    },
  };
  const loadSource = loadSourceWith(env);
  const loadState = loadStateWith(env);
  const loadActions = loadActionsWith(env);
  const evaluate = evaluateWith(env);

  // TODO: add debug logging

  return (contractId, sortKeyHeight) => {
    return of({ id: contractId, to: sortKeyHeight })
      .chain(loadSource)
      .chain(loadState)
      .chain(loadActions)
      .chain(evaluate)
      .map((ctx) => ctx.output)
      .toPromise();
  };
}

/**
 * @typedef Env1
 * @property {fetch} fetch
 * @property {z.infer<typeof sequencerClientSchema>} sequencer
 * @property {string} GATEWAY_URL
 *
 * @typedef WriteInteractionResult
 * @property {string} originalTxId - the id of the transaction that represents this interaction
 * @property {any} bundlrResponse - bundlr response from the gatewy
 *
 * @callback WriteInteraction
 * @param {string} contractId
 * @param {Record<string, any>} input
 * @param {any} wallet
 * @param {any[]} tags
 * @returns {Promise<WriteInteractionResult>} result
 *
 * @param {Env1} - the environment
 * @returns {WriteInteraction}
 */
export function writeInteractionWith({ fetch, GATEWAY_URL, sequencer }) {
  /**
   * build dal, injecting bottom lvl deps
   */
  const loadTransactionMeta = loadTransactionMetaWith({ fetch, GATEWAY_URL });

  /**
   * build the domain, injecting various dal deps as the env
   */
  const env = {
    loadTransactionMeta,
    sequencer
  };

  const verifyContract = verifyContractWith(env);
  const verifyInput = verifyInputWith(env);
  const buildTx = buildTxWith(env);

  return (contractId, input, wallet, tags) => {
    return of({ id: contractId, input, wallet, tags })
      .chain(verifyContract) // verify contract (is TX a smart contract)
      .chain(verifyInput) // verify input shape
      .chain(buildTx) // construct interaction to send ie. add tags, etc.
      .chain(fromPromise(sequencer.writeInteraction)) // write to the sequencer
      .map(ctx => ctx)
      .toPromise();
  };
}
