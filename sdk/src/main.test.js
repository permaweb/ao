import test from "node:test";
import assert from "node:assert/strict";

import * as pouchDbClient from "./client/pouchdb.js";
import {
  loadInteractionsWith,
  writeInteractionWith,
} from "./client/warp-sequencer.js";
import { createLogger } from "./logger.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";
const CONTRACT = "VkjFCALjk4xxuCilddKS8ShZ-9HdeqeuYQOgMgWucro";

const logger = createLogger("@permaweb/ao-sdk");

test("readState", async () => {
  const { readStateWith } = await import("./main.js");

  const result = await readStateWith({
    fetch,
    GATEWAY_URL,
    // TODO: we should stub these for the test
    db: {
      findLatestEvaluation: pouchDbClient
        .findLatestEvaluationWith({
          pouchDb: pouchDbClient.pouchDb,
          logger,
        }),
      saveEvaluation: pouchDbClient.saveEvaluationWith({
        pouchDb: pouchDbClient.pouchDb,
        logger,
      }),
    },
    sequencer: {
      loadInteractions: loadInteractionsWith({ fetch, SEQUENCER_URL, logger, pageSize: 2500 }),
      writeInteractionWith: writeInteractionWith({ fetch, SEQUENCER_URL }),
    },
    logger,
  })(
    CONTRACT,
  );
  console.log(result);
  assert.ok(true);
});
