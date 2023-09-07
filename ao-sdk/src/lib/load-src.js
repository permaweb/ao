import { fromPromise, of } from "hyper-async";
import { assoc, path, prop, reduce } from "ramda";
import { z } from "zod";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";

export const GET_CONTRACT_QUERY = `
query GetContract ($contractId: ID!) {
  transactions(first: 1, ids: [$contractId]) {
    edges {
      node {
        tags {
          name
          value
        }
      }
    }
  }
}`;

const transactionConnectionSchema = z.object({
  data: z.object({
    transactions: z.object({
      edges: z.array(z.object({
        node: z.object({
          tags: z.array(z.object({
            name: z.string(),
            value: z.string(),
          })),
        }),
      })),
    }),
  }),
});

const contractSrcIdSchema = z.string().min(
  1,
  "Contract-Src tag was not present on the transaction",
);

/**
 * @typedef Env
 * @property {fetch} fetch
 */

/**
 * @callback LoadSourceBuffer
 * @param {string} srcId
 * @returns {Async<ArrayBuffer>}
 *
 * @param {Env} env
 * @returns {LoadSourceBuffer}
 */
function getSourceBufferWith({ fetch }) {
  return (srcId) => {
    return of(srcId)
      .chain(fromPromise((id) =>
        fetch(`${GATEWAY_URL}/${id}`)
          .then((res) => res.arrayBuffer())
      ));
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
function getSourceIdWith({ fetch }) {
  return (id) => {
    return of(id)
      .chain(fromPromise((id) =>
        fetch(`${GATEWAY_URL}/graphql`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: GET_CONTRACT_QUERY,
            variables: { contractId: id },
          }),
        })
          .then((res) => res.json())
          .then(transactionConnectionSchema.parse)
          .then(path(["data", "transactions", "edges", "0", "node", "tags"]))
          .then(reduce((a, t) => assoc(t.name, t.value, a), {}))
          .then(prop("Contract-Src"))
          .then(contractSrcIdSchema.parse)
      ));
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
export function loadSourceWith({ fetch }) {
  const getSourceId = getSourceIdWith({ fetch });
  const getSourceBuffer = getSourceBufferWith({ fetch });

  return ({ id }) => {
    return of(id)
      .chain(getSourceId)
      .chain(getSourceBuffer)
      .map((src) => ({ id, src }));
  };
}
