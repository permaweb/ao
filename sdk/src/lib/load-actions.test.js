import test from "node:test";
import assert from "node:assert/strict";

const CONTRACT = "SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY";

test("load interactions for contract", async () => {
  // need to provide context with contract id
  const { loadActions } = await import("./load-actions.js");
  // need to request all interactions
  const result = await loadActions({ id: CONTRACT }).toPromise();
  // need to add interactions to context
  assert.ok(result.actions);
  assert.ok(true);
});
