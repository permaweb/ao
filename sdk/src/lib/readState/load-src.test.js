import { describe, test } from "node:test";
import * as assert from "node:assert";
import { Resolved } from "hyper-async";

import { createLogger } from "../../logger.js";
import { loadSourceWith } from "./load-src.js";

const CONTRACT = "contract-123-9HdeqeuYQOgMgWucro";
const logger = createLogger("@permaweb/ao-sdk:readState");

describe("load-src", () => {
  test("return contract source and contract id and contract owner", async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({
          owner: { address: "woohoo" },
          tags: [{ name: "Contract-Src", value: "foobar" }],
        }),
      logger,
    });

    const result = await loadSource({ id: CONTRACT }).toPromise();
    assert.equal(result.src.byteLength, 17);
    assert.equal(result.id, CONTRACT);
    assert.equal(result.owner, "woohoo");
  });

  test("throw if the Contract-Src tag is not provided", async () => {
    const loadSource = loadSourceWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [{ name: "Not-Contract-Src", value: "foobar" }] }),
      logger,
    });

    await loadSource({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });
});
