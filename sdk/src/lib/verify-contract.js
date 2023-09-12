import { of } from "hyper-async";
import { assoc, path, reduce } from "ramda";
import { z } from "zod";

const transactionSchema = z.object({
    tags: z.array(z.object({
      name: z.string(),
      value: z.string(),
    })),
});

const contractTagsSchema = z.object({
    "Contract-Src": z.string().min(
        1,
        { message: "Contract-Src tag was not present on the transaction" },
    ),
    "App-Name": z.literal('SmartWeaveContract'),
    "App-Version": z.literal('0.3.0')
})

/**
 * @callback LoadTransactionMeta
 * @param {string} id - the id of the transaction
 * @returns {Async<z.infer<typeof transactionSchema>>}
 *
 * @typedef Env
 * @property {LoadTransactionMeta} loadTransactionMeta
 */

/**
 * @callback ContractId
 * @param {string} id - the id of the contract being verified
 * @returns {Async<string>}
 *
 * @param {Env} env
 * @returns {ContractId}
 */
function verfiyTagsWith({ loadTransactionMeta }) {
    return (id) => {
      return loadTransactionMeta(id)
        .map(transactionSchema.parse)
        .map(path(["tags"]))
        .map(reduce((a, t) => assoc(t.name, t.value, a), {}))
        .map(contractTagsSchema.parse);
    };
}

/**
 * @typedef Args
 * @property {string} id - the transaction id to be verified
 *
 * @typedef Result
 * @property {string} id - the transaction id to be verified
 *
 * @callback VerifyContract
 * @param {Args} args
 * @returns {Async<Result>}
 *
 * @param {Env} env
 * @returns {VerifyContract}
 */
export function verifyContractWith(env) {
    const verfiyTags = verfiyTagsWith(env);
    return (ctx) => {
        return of(ctx.id)
            .chain(verfiyTags);
    };
}