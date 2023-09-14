import { fromPromise, of } from "hyper-async";
import { __, assoc, path, prop, reduce } from "ramda";
import { z } from "zod";

const transactionSchema = z.object({
  tags: z.array(z.object({
    name: z.string(),
    value: z.string(),
  })),
});

const contractSrcIdSchema = z.string().min(
  1,
  { message: "Contract-Src tag was not present on the transaction" },
);

/**
 * The result that is produced from this step
 * and added to ctx.
 *
 * This is used to parse the output to ensure the correct shape
 * is always added to context
 */
const srcSchema = z.object({
  src: z.any().refine((val) => !!val),
}).passthrough();

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
 * @callback LoadSourceBuffer
 * @param {string} srcId
 * @returns {Async<ArrayBuffer>}
 *
 * @param {Env} env
 * @returns {LoadSourceBuffer}
 */
function getSourceBufferWith({ loadTransactionData }) {
  return (srcId) => {
    return loadTransactionData(srcId)
      .chain(fromPromise((res) => res.arrayBuffer()));
  };
}

/**
 * @callback LoadContractSrcId
 * @param {string} id - the id of the contract whose src is being loaded
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {LoadContractSrcId}
 */
function getSourceIdWith({ loadTransactionMeta }) {
  return (id) => {
    return loadTransactionMeta(id)
      .map(transactionSchema.parse)
      .map(path(["tags"]))
      .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
      .map(prop("Contract-Src"))
      .map(contractSrcIdSchema.parse);
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
export function loadSourceWith(env) {
  const getSourceId = getSourceIdWith(env);
  const getSourceBuffer = getSourceBufferWith(env);

  return (ctx) => {
    return of(ctx.id)
      .chain(getSourceId)
      .chain(getSourceBuffer)
      .map(assoc("src", __, ctx))
      .map(srcSchema.parse);
  };
}
