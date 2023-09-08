import { describe, test } from "node:test";
import assert from "node:assert/strict";

const CONTRACT = "SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY";

import { loadActionsWith } from "./load-actions.js";
import { Resolved } from "hyper-async";

describe("load-actions", () => {
  test("return actions", async () => {
    const loadActions = loadActionsWith({
      loadInteractions: ({ id, from, to }) =>
        Resolved([
          { function: "createOrder" },
          { function: "createOrder" },
        ]),
    });
    const result = await loadActions({ id: CONTRACT }).toPromise();
    assert.ok(result.actions);
    assert.ok(true);
  });

  test("throw if actions are not in expected shape", async () => {
    const loadActions = loadActionsWith({
      loadInteractions: ({ id, from, to }) =>
        Resolved([
          { not_function: "createOrder" },
        ]),
    });
    await loadActions({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });
});
