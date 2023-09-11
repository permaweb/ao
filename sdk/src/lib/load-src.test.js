import { describe, test } from "node:test";
import * as assert from "node:assert";

import { loadSourceWith } from "./load-src.js";
import { Resolved } from "hyper-async";

const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

describe("load-src", () => {
  test("return contract source and contract id", async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [{ name: "Contract-Src", value: "foobar" }] }),
    });

    const result = await loadSource({ id: CONTRACT }).toPromise();
    assert.equal(result.src.byteLength, 17);
    assert.equal(result.id, CONTRACT);
  });

  test("throw if the Contract-Src tag is not provided", async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [{ name: "Not-Contract-Src", value: "foobar" }] }),
    });

    await loadSource({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });
});
