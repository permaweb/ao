import { readStateWith } from "./main.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";

export const readState = readStateWith({ fetch, GATEWAY_URL });
