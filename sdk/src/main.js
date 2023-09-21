import { fromPromise, of } from "hyper-async";
import { z } from "zod";

import {
  dbClientSchema,
  loadTransactionDataWith,
  loadTransactionMetaWith,
  muClientSchema,
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
 * @property {any} loadTransactionData
 * @property {any} loadTransactionMeta
 * @property {any} sequencer
 * @property {any} db
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
export function readStateWith(env) {
  const loadSource = loadSourceWith(env);
  const loadState = loadStateWith(env);
  const loadActions = loadActionsWith(env);
  const evaluate = evaluateWith(env);

  return (contractId, sortKeyHeight) => {
    return of({ id: contractId, to: sortKeyHeight })
      .chain(loadSource)
      .chain(loadState)
      .chain(loadActions)
      .chain(evaluate)
      .map((ctx) => ctx.output)
      .map(
        env.logger.tap(
          `readState result for contract "%s" to sortKey "%s": %O`,
          contractId,
          sortKeyHeight || "latest",
        ),
      )
      .toPromise();
  };
}

/**
 * @typedef Env1
 * @property {any} loadTransactionMeta
 * @property {z.infer<typeof muClientSchema>} mu
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
export function writeInteractionWith(env) {
  const verifyContract = verifyContractWith(env);
  const verifyInput = verifyInputWith(env);
  const buildTx = buildTxWith(env);

  return (contractId, input, wallet, tags) => {
    return of({ id: contractId, input, wallet, tags })
      .chain(verifyContract) // verify contract (is TX a smart contract)
      .chain(verifyInput) // verify input shape
      .chain(buildTx) // construct interaction to send ie. add tags, etc.
      .chain(env.mu.writeInteraction) // write to the messenger
      .map((ctx) => ctx)
      .toPromise();
  };
}
