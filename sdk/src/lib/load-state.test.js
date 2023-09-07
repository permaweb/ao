import { describe, test } from "node:test";
import * as assert from "node:assert";

import { loadInitialStateWith } from "./load-state.js";
import { Resolved } from "hyper-async";

const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

describe("load-state", () => {
  test("add the initial state from Init-State", async () => {
    const loadInitialState = loadInitialStateWith({
      loadTransactionData: (_id) => Resolved(assert.fail("unreachable")),
      loadTransactionMeta: (_id) =>
        Resolved({
          tags: [{ name: "Init-State", value: JSON.stringify({ foo: "bar" }) }],
        }),
    });

    const result = await loadInitialState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
  });

  test("add the initial state from Init-State-Tx", async () => {
    const initStateTx = CONTRACT;

    const loadInitialState = loadInitialStateWith({
      loadTransactionData: (id) => {
        assert.equal(id, initStateTx);
        return Resolved(new Response(JSON.stringify({ foo: "bar" })));
      },
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [{ name: "Init-State-Tx", value: initStateTx }] }),
    });

    const result = await loadInitialState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
  });

  test("add the initial state from transaction data", async () => {
    const loadInitialState = loadInitialStateWith({
      loadTransactionData: (id) => {
        assert.equal(id, CONTRACT);
        return Resolved(new Response(JSON.stringify({ foo: "bar" })));
      },
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [{ name: "Title", value: "Foobar" }] }),
    });

    const result = await loadInitialState({ id: CONTRACT }).toPromise();
    assert.ok(result.id);
    assert.deepStrictEqual(result.state, { foo: "bar" });
  });
});
