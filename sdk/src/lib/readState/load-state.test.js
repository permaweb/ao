import { describe, test } from "node:test";
import * as assert from "node:assert";
import { Resolved } from "hyper-async";

import { createLogger } from "../../logger.js";
import { loadStateWith } from "./load-state.js";

const CONTRACT = "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro";
const logger = createLogger("@permaweb/ao-sdk:readState");

describe("load-state", () => {
  test("add the most recent state from cache", async () => {
    const loadState = loadStateWith({
      db: {
        findLatestEvaluation: ({ id, _to }) =>
          Resolved({
            id: "123-contract,123_sortkey",
            output: { state: { foo: "bar" } },
            sortKey: "123_sortKey",
          }),
      },
      loadTransactionData: (_id) => Resolved(assert.fail("unreachable")),
      loadTransactionMeta: (_id) => Resolved(assert.fail("unreachable")),
      logger,
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, "123_sortKey");
  });

  test("add the initial state from Init-State", async () => {
    const loadState = loadStateWith({
      db: {
        findLatestEvaluation: ({ _id, _to }) => Resolved(undefined),
      },
      loadTransactionData: (_id) => Resolved(assert.fail("unreachable")),
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Init-State", value: JSON.stringify({ foo: "bar" }) }],
        }),
      logger,
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, undefined);
  });

  test("add the initial state from Init-State-Tx", async () => {
    const initStateTx = CONTRACT;

    const loadState = loadStateWith({
      db: {
        findLatestEvaluation: ({ _id, _to }) => Resolved(undefined),
      },
      loadTransactionData: (id) => {
        assert.equal(id, initStateTx);
        return Resolved(new Response(JSON.stringify({ foo: "bar" })));
      },
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Init-State-Tx", value: initStateTx }],
        }),
      logger,
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, undefined);
  });

  test("add the initial state from transaction data", async () => {
    const loadState = loadStateWith({
      db: {
        findLatestEvaluation: ({ _id, _to }) => Resolved(undefined),
      },
      loadTransactionData: (id) => {
        assert.equal(id, CONTRACT);
        return Resolved(new Response(JSON.stringify({ foo: "bar" })));
      },
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Title", value: "Foobar" }],
        }),
      logger,
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, undefined);
  });
});
