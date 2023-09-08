import test from "node:test";
import assert from "node:assert/strict";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";
const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

test("readState", async () => {
  const { readStateWith } = await import("./main.js");
  const result = await readStateWith({ fetch, GATEWAY_URL, SEQUENCER_URL })(CONTRACT);
  console.log(result);
  assert.ok(true);
});
