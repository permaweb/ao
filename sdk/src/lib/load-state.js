import { fromPromise, of, Rejected, Resolved } from "hyper-async";
import { __, assoc, path, pick, reduce } from "ramda";
import { z } from "zod";

const [INIT_STATE_TAG, INIT_STATE_TX_TAG] = ["Init-State", "Init-State-TX"];

const transactionSchema = z.object({
  tags: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })),
});

/**
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the transaction
 * @returns {Async<z.infer<typeof transactionSchema>>}
 *
 * @callback LoadTransaction
 * @param {string} id - the id of the transaction
 * @returns {Async<Response>}
 *
 * @typedef Env
 * @property {LoadTransactionMeta} loadTransactionMeta
 * @property {LoadTransaction} loadTransactionData
 */

/**
 * @callback ResolveInitialState
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<Record<string, any>>}
 *
 * @param {Env} env
 * @returns {ResolveInitialState}
 */
function resolveStateWith({ loadTransactionData }) {
  function maybeInitState(ctx) {
    if (!ctx.tags[INIT_STATE_TAG]) {
      return Rejected(ctx);
    }

    return Resolved(JSON.parse(ctx.tags["Init-State"]));
  }

  function maybeInitStateTx(ctx) {
    if (!ctx.tags[INIT_STATE_TX_TAG]) return Rejected(ctx);

    return loadTransactionData(ctx.tags[INIT_STATE_TX_TAG])
      .chain(fromPromise((res) => res.json()));
  }

  function maybeData(ctx) {
    return loadTransactionData(ctx.id)
      .chain(fromPromise((res) => res.json()));
  }

  /**
   * First check Init-State tag
   * Then check Init-State-Tx tag and fetch if defined
   * Then check transaction data
   */
  return (ctx) =>
    of(ctx)
      .bichain(Rejected, maybeInitState)
      .bichain(maybeInitStateTx, Resolved)
      .bichain(maybeData, Resolved);
}

/**
 * @callback LoadInitialStateTags
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadInitialStateTags}
 */
function getSourceInitStateTagsWith({ loadTransactionMeta }) {
  return (id) => {
    return loadTransactionMeta(id)
      .map(transactionSchema.parse)
      .map(path(["tags"]))
      .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
      .map(pick([INIT_STATE_TAG, INIT_STATE_TX_TAG]))
      .map((tags) => ({ tags, id }));
  };
}

/**
 * @typedef Args
 * @property {string} id - the id of the contract
 *
 * @typedef Result
 * @property {string} id - the id of the contract
 * @property {ArrayBuffer} src - an array buffer that contains the Contract Wasm Src
 *
 * @callback LoadSource
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {LoadSource}
 */
export function loadInitialStateWith(env) {
  const getSourceInitStateTags = getSourceInitStateTagsWith(env);
  const resolveState = resolveStateWith(env);

  return (ctx) => {
    return of(ctx.id)
      .chain(getSourceInitStateTags)
      .chain(resolveState)
      .map(assoc("state", __, ctx));
  };
}
