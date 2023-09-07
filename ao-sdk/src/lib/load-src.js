import { fromPromise, of } from "hyper-async";
import { assoc, pathOr, prop, reduce } from "ramda";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";

export function loadSource({ id }) {
  return of(id)
    .chain(getSourceId)
    .chain(getSourceBuffer)
    .map((src) => ({ id, src }));
}

function getSourceBuffer(srcId) {
  return fromPromise((id) =>
    fetch(`${GATEWAY_URL}/${id}`)
      .then((res) => res.arrayBuffer())
  )(srcId);
}

function getSourceId(id) {
  return fromPromise((id) =>
    fetch(`${GATEWAY_URL}/graphql`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: buildContractQuery(id) }),
    })
      .then((res) => res.json())
      .then(
        pathOr(null, ["data", "transactions", "edges", "0", "node", "tags"]),
      )
      .then(reduce((a, t) => assoc(t.name, t.value, a), {}))
      .then(prop("Contract-Src"))
  )(id);
}

function buildContractQuery(contractId) {
  return `query {
    transactions(first: 1, ids: ["${contractId}"]) {
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
}
