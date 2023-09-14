import test from "node:test";
import assert from "node:assert/strict";

import * as pouchDb from "./client/pouchdb.js";
import {
  loadInteractionsWith,
  writeInteractionWith,
} from "./client/warp-sequencer.js";
import { createLogger } from "./logger.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";
const CONTRACT = "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro";

test("readState", async () => {
  const { readStateWith } = await import("./main.js");

  const result = await readStateWith({
    fetch,
    GATEWAY_URL,
    // TODO: we should stub these for the test
    db: {
      findLatestInteraction: pouchDb.findLatestInteractionWith(),
      saveInteraction: pouchDb.saveInteractionWith(),
    },
    sequencer: {
      loadInteractions: loadInteractionsWith({ fetch, SEQUENCER_URL }),
      writeInteractionWith: writeInteractionWith({ fetch, SEQUENCER_URL }),
    },
    logger: createLogger("@permaweb/ao-sdk"),
  })(
    CONTRACT,
  );
  console.log(result);
  assert.ok(true);
});
