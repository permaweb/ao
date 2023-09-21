import { dbClientSchema, sequencerClientSchema, muClientSchema } from "./dal.js";
import { readStateWith, writeInteractionWith } from "./main.js";
import { createLogger } from "./logger.js";

// Precanned clients to use for OOTB apis
import * as PouchDbClient from "./client/pouchdb.js";
import * as WarpSequencerClient from "./client/warp-sequencer.js";
import * as MuClient from "./client/ao-mu.js";

const GATEWAY_URL = globalThis.GATEWAY || "https://arweave.net";
const SEQUENCER_URL = globalThis.SEQUENCER_URL || "https://gw.warp.cc";
const MU_URL = globalThis.MU_URL || "https://ao-mu-1.onrender.com";
const CU_URL = globalThis.CU_URL || "https://ao-cu-1.onrender.com";

const logger = createLogger("@permaweb/ao-sdk");

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
    loadInteractions: WarpSequencerClient.loadInteractionsWith({
      fetch,
      SEQUENCER_URL,
      pageSize: 2500,
      logger: logger.child("readState:sequencer"),
    }),
  }),
  db: dbClientSchema.parse({
    findLatestEvaluation: PouchDbClient.findLatestEvaluationWith({
      pouchDb: PouchDbClient.pouchDb,
      logger: logger.child("readState:db"),
    }),
    saveEvaluation: PouchDbClient.saveEvaluationWith({
      pouchDb: PouchDbClient.pouchDb,
      logger: logger.child("readState:db"),
    }),
  }),
  logger,
});

/**
 * default writeInteraction that works OOTB
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 * - use arbundles createData for signing
 */
export const writeInteraction = writeInteractionWith({
  fetch,
  GATEWAY_URL,
  mu: muClientSchema.parse({
    writeInteraction: MuClient.writeInteractionWith({
      fetch,
      MU_URL,
      CU_URL
    }),
    signInteraction: MuClient.signInteractionWith({
      createDataItem: MuClient.createData,
    }),
  }),
  logger,
});
