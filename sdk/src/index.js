import { dbClientSchema, sequencerClientSchema } from "./dal.js";
import { readStateWith, writeInteractionWith } from "./main.js";

// Precanned clients to use for OOTB apis
import { findLatestInteraction, saveInteraction } from "./client/pouchdb.js";
import {
  loadInteractionsWith,
  writeInteractionWith,
} from "./client/warp-sequencer.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";

/**
 * TODO: export a 'connect' that allows providing
 * - own db client impl,
 * - own sequencer client impl
 * - own gateway url
 */

/**
 * default readState that works OOTB
 * - Uses PouchDB to cache interactions
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 */
export const readState = readStateWith({
  fetch,
  GATEWAY_URL,
  sequencer: sequencerClientSchema.parse({
    loadInteractions: loadInteractionsWith({ fetch, SEQUENCER_URL }),
    writeInteraction: writeInteractionWith({ fetch, SEQUENCER_URL }),
  }),
  db: dbClientSchema.parse({ findLatestInteraction, saveInteraction }),
});

/**
 * default writeInteraction that works OOTB
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 */
export const writeInteraction = writeInteractionWith({
  fetch,
  GATEWAY_URL,
  sequencer: sequencerClientSchema.parse({
    loadInteractions: loadInteractionsWith({ fetch, SEQUENCER_URL }),
    writeInteraction: writeInteractionWith({ fetch, SEQUENCER_URL }),
  }),
});
