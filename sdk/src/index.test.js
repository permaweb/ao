import test from "node:test";
import assert from "node:assert/strict";

import { readState } from "./index.js";

const CONTRACT = "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro";

test("readState", async () => {
  const result = await readState(CONTRACT);
  console.log(result);
  assert.ok(true);
});
