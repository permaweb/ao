import { fromPromise, of } from "hyper-async";
import { z } from "zod";

import {
  dbClientSchema,
  loadTransactionDataWith,
  loadTransactionMetaWith,
  sequencerClientSchema,
} from "./dal.js";
import { loadSourceWith } from "./lib/load-src.js";
import { loadStateWith } from "./lib/load-state.js";
import { loadActionsWith } from "./lib/load-actions.js";
import { evaluateWith } from "./lib/evaluate.js";
import { verifyContractWith } from "./lib/verify-contract.js";
import { verifyInputWith } from "./lib/verify-input.js";
import { buildTxWith } from "./lib/build-tx.js";

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
      // .chain(evaluate)
      // .map((ctx) => ctx.output)
      .toPromise();
  };
}

/**
 * @typedef Env1
 * @property {fetch} fetch
 * @property {z.infer<typeof sequencerClientSchema>} sequencerClient
 *
 * @typedef WriteInteractionResult
 * @property {string} id - the id of the transaction that represents this interaction
 *
 * @callback WriteInteraction
 * @param {string} contractId
 * @param {Record<string, any>} input
 * @returns {Promise<WriteInteractionResult>} result
 *
 * @param {Env1} - the environment
 * @returns {WriteInteraction}
 */
export function writeInteractionWith({ fetch, GATEWAY_URL, SEQUENCER_URL }) {
  const writeInteraction = writeInteractionWith;

  /**
   * build dal, injecting bottom lvl deps
   */
  const loadTransactionMeta = loadTransactionMetaWith({ fetch, GATEWAY_URL });

  /**
   * build the domain, injecting various dal deps as the env
   */
  const env = {
    loadTransactionMeta,
  };

  const verifyContract = verifyContractWith(env);
  const verifyInput = verifyInputWith(env);
  const buildTx = buildTxWith(env);

  return (contractId, input) => {
    return of({ id: contractId, input })
      .chain(verifyContract) // verify contract (is TX a smart contract)
      .chain(verifyInput) // verify input shape
      .chain(buildTx) // construct interaction to send ie. add tags, etc.
      // .chain(writeInteraction)
      // .map(ctx => ({ id: ctx.id }))
      .toPromise();
  };
}
