import { of } from "hyper-async";
import { z } from "zod";
import { __, append, assoc } from "ramda";

const tagSchema = z.array(z.object({
  name: z.string(),
  value: z.string(),
}));

/**
 * @typedef Tag3
 * @property {string} name
 * @property {any} value
 *
 * @typedef Context3
 * @property {string} id - the transaction id to be verified
 * @property {any} input
 * @property {any} wallet
 * @property {Tag3[]} tags
 *
 * @typedef Env6
 * @property {any} mu
 */

/**
 * @callback BuildTags
 * @param {Context3} ctx
 * @returns {Context3}
 *
 * @returns { BuildTags }
 */
function buildTagsWith() {
  return (ctx) => {
    return of(ctx.tags)
      .map(append({ name: "App-Name", value: "SmartWeaveAction" }))
      .map(append({ name: "App-Version", value: "0.3.0" }))
      .map(append({ name: "Contract", value: ctx.id }))
      .map(append({ name: "Input", value: JSON.stringify(ctx.input) }))
      .map(append({ name: "SDK", value: "ao" }))
      .map(tagSchema.parse)
      .map(assoc("tags", __, ctx));
  };
}

/**
 * @callback BuildData
 * @param {Context3} ctx
 * @returns {Context3}
 *
 * @returns { BuildData }
 */
function buildDataWith() {
  return (ctx) => {
    return of(ctx)
      .map(() => Math.random().toString().slice(-4))
      .map(assoc("data", __, ctx));
  };
}

/**
 * @callback SignWith
 * @param {Context3} ctx
 * @returns {Context3}
 *
 * @param {Env6}
 * @returns { SignWith }
 */
function signWith(env) {
  return (ctx) => {
    return of(ctx)
      .map(env.mu.signInteraction)
      .map(assoc("signedData", __, ctx));
  };
}

/**
 * @callback BuildTx
 * @param {Context3} ctx
 * @returns {Async<Context3>}
 *
 * @param {Env6} env
 * @returns {BuildTx}
 */
export function buildTxWith(env) {
  let buildTags = buildTagsWith();
  let buildData = buildDataWith();
  let sign = signWith(env);

  return (ctx) => {
    return of(ctx)
      .chain(buildTags) // create tags
      .chain(buildData) // generate random number as data item
      .chain(sign); // sign with sequencer client
  };
}
