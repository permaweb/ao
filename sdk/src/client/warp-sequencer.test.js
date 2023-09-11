import { describe, test } from "node:test";
import * as assert from "node:assert";

import { loadInteractionsWith } from "./warp-sequencer.js";

const SEQUENCER_URL = "https://gw.warp.cc";
const CONTRACT = "SFKREVkacx7N64SIfAuNkMOPTocm42qbkKwzRJGfQHY";

describe("warp-sequencer", () => {
  describe("loadInteractions", () => {
    test("load the interactions from the sequencer", async () => {
      const loadInteractions = loadInteractionsWith({
        fetch,
        SEQUENCER_URL,
      });

      const res = await loadInteractions({
        id: CONTRACT,
        from: "",
        to: "",
      });
      assert.ok(res.length);
      const [firstInteraction] = res;
      assert.ok(firstInteraction.action);
      assert.ok(firstInteraction.action.function);
      assert.ok(firstInteraction.sortKey);
    });
  });

  describe("writeInteraction", () => {
    // TODO
  });
});
