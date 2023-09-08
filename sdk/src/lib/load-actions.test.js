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
          { action: { function: "createOrder" }, sortKey: "abcd,123,fsdf" },
          { action: { function: "createOrder" }, sortKey: "fdsa,456,cdskjfs" },
        ]),
    });
    const result = await loadActions({ id: CONTRACT }).toPromise();
    assert.ok(result.actions);
    assert.ok(result.id);

    const [firstInteraction] = result.actions;
    assert.ok(firstInteraction.action);
    assert.ok(firstInteraction.sortKey);
  });

  test("throw if actions are not in expected shape", async () => {
    const loadActionsNoAction = loadActionsWith({
      loadInteractions: ({ id, from, to }) =>
        Resolved([
          { not_action: { function: "createOrder" }, sortKey: "abcd,123,fsdf" },
        ]),
    });
    await loadActionsNoAction({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);

    const loadActionsNoSortKey = loadActionsWith({
      loadInteractions: ({ id, from, to }) =>
        Resolved([
          { action: { function: "createOrder" }, noSortKey: "abcd,123,fsdf" },
        ]),
    });
    await loadActionsNoSortKey({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });
});
