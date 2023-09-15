import test from "node:test";
import assert from "node:assert/strict";

import { readState } from "./index.js";

const CONTRACT = "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro";
/**
 * js contract, with lots of interactions. Good for debugging interactions bit
 */
// const CONTRACT = 'SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY'

test("readState", async () => {
  const result = await readState(CONTRACT);
  console.log(result);
  assert.ok(true);
});
