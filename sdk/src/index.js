import { readStateWith, writeInteractionWith } from "./main.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";

const dbClient = {};

export const readState = readStateWith({
  fetch,
  GATEWAY_URL,
  SEQUENCER_URL,
  dbClient,
});

export const writeInteraction = writeInteractionWith({
  fetch,
  SEQUENCER_URL,
});
