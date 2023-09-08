import { fromPromise, of, Rejected, Resolved } from "hyper-async";
import {
  __,
  always,
  applySpec,
  assoc,
  mergeRight,
  path,
  pick,
  pipe,
  prop,
  reduce,
} from "ramda";
import { z } from "zod";

const [INIT_STATE_TAG, INIT_STATE_TX_TAG] = ["Init-State", "Init-State-TX"];

const transactionSchema = z.object({
  tags: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })),
  block: z.object({
    height: z.number(),
  }),
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
 * @typedef LoadInitialStateTagsArgs
 * @property {string} id - the id of the contract
 *
 * @callback LoadInitialStateTags
 * @param {LoadInitialStateTagsArgs} args
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadInitialStateTags}
 */
function getSourceInitStateTagsWith({ loadTransactionMeta }) {
  return ({ id }) => {
    return loadTransactionMeta(id)
      .map(transactionSchema.parse)
      .map(pick(["tags", "block"]))
      .map(applySpec({
        id: always(id),
        tags: pipe(
          prop("tags"),
          reduce((a, t) => assoc(t.name, t.value, a), {}),
          pick([INIT_STATE_TAG, INIT_STATE_TX_TAG]),
        ),
        /**
         * TODO: is this right? Can I use the block height as the sort key?
         */
        from: path(["block", "height"]),
      }));
  };
}

/**
 * @typedef MostRecentStateArgs
 * @property {string} id - the contract id
 * @property {string} to - the uppermost sort key
 *
 * @callback LoadMostRecentState
 * @param {MostRecentStateArgs} args
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadMostRecentState}
 */
function getMostRecentStateWith({ db }) {
  return ({ id, to }) =>
    db.findLatestInteraction({ id, to })
      .chain((interaction) => {
        if (!interaction) return Rejected({ id, to });
        return Resolved({
          state: interaction.resultantState,
          from: interaction.id,
        });
      });
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
export function loadStateWith(env) {
  const getMostRecentState = getMostRecentStateWith(env);
  const getSourceInitStateTags = getSourceInitStateTagsWith(env);
  const resolveState = resolveStateWith(env);

  return (ctx) => {
    return of({ id: ctx.id, to: ctx.to })
      .bichain(Rejected, getMostRecentState)
      .bichain(
        ({ id }) =>
          getSourceInitStateTags({ id })
            .chain((meta) => resolveState(meta).map(assoc("state", __, meta))),
        Resolved,
      )
      .map((res) =>
        mergeRight(ctx, {
          /**
           * The most recent state. This could be the most recent
           * cached state, or potentially the initial state
           * if no interactions are cached
           */
          state: res.state,
          /**
           * The most recent interaction sortKey. This could be the most recent
           * cached interaction, or potentially the initial state sort key,
           * if no interactions were cached
           *
           * This will be used to subsequently determine which interactions
           * need to be fetched from the network in order to perform the evaluation
           */
          from: res.from,
        })
      );
  };
}
