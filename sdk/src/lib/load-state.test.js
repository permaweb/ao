import { describe, test } from "node:test";
import * as assert from "node:assert";

import { loadStateWith } from "./load-state.js";
import { Resolved } from "hyper-async";

const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

describe("load-state", () => {
  test("add the most recent state from cache", async () => {
    const loadState = loadStateWith({
      db: {
        findLatestInteraction: ({ id, _to }) =>
          Resolved({
            id: "123_sortkey",
            output: { state: { foo: "bar" } },
          }),
      },
      loadTransactionData: (_id) => Resolved(assert.fail("unreachable")),
      loadTransactionMeta: (_id) => Resolved(assert.fail("unreachable")),
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
  });

  test("add the initial state from Init-State", async () => {
    const loadState = loadStateWith({
      db: {
        findLatestInteraction: ({ _id, _to }) => Resolved(undefined),
      },
      loadTransactionData: (_id) => Resolved(assert.fail("unreachable")),
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Init-State", value: JSON.stringify({ foo: "bar" }) }],
          block: {
            id: "456",
            height: 123,
            timestamp: new Date().getTime(),
          },
        }),
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, "000000000123");
  });

  test("add the initial state from Init-State-Tx", async () => {
    const initStateTx = CONTRACT;

    const loadState = loadStateWith({
      db: {
        findLatestInteraction: ({ _id, _to }) => Resolved(undefined),
      },
      loadTransactionData: (id) => {
        assert.equal(id, initStateTx);
        return Resolved(new Response(JSON.stringify({ foo: "bar" })));
      },
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Init-State-Tx", value: initStateTx }],
          block: {
            id: "456",
            height: 123,
            timestamp: new Date().getTime(),
          },
        }),
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, "000000000123");
  });

  test("add the initial state from transaction data", async () => {
    const loadState = loadStateWith({
      db: {
        findLatestInteraction: ({ _id, _to }) => Resolved(undefined),
      },
      loadTransactionData: (id) => {
        assert.equal(id, CONTRACT);
        return Resolved(new Response(JSON.stringify({ foo: "bar" })));
      },
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Title", value: "Foobar" }],
          block: {
            id: "456",
            height: 123,
            timestamp: new Date().getTime(),
          },
        }),
    });

    const result = await loadState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
    assert.equal(result.from, "000000000123");
  });
});
