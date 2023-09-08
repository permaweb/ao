import { readStateWith } from "./main.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";

export const readState = readStateWith({ fetch, GATEWAY_URL, SEQUENCER_URL });
