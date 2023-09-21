import { fromPromise } from "hyper-async";

import {
  dbClientSchema,
  loadTransactionDataWith,
  loadTransactionMetaWith,
  muClientSchema,
  sequencerClientSchema,
} from "./dal.js";
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
 * default readState that works OOTB
 * - Uses PouchDB to cache interactions
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 */
const readStateLogger = logger.child("readState");
export const readState = readStateWith({
  loadTransactionMeta: loadTransactionMetaWith({ fetch, GATEWAY_URL }),
  loadTransactionData: loadTransactionDataWith({ fetch, GATEWAY_URL }),
  loadInteractions: fromPromise(
    sequencerClientSchema.shape.loadInteractions.implement(
      WarpSequencerClient.loadInteractionsWith({
        fetch,
        SEQUENCER_URL,
        pageSize: 2500,
        logger: readStateLogger.child("sequencer"),
      }),
    ),
  ),
  db: {
    findLatestEvaluation: fromPromise(
      dbClientSchema.shape.findLatestEvaluation.implement(
        PouchDbClient.findLatestEvaluationWith({
          pouchDb: PouchDbClient.pouchDb,
          logger: readStateLogger.child("db"),
        }),
      ),
    ),
    saveEvaluation: fromPromise(
      dbClientSchema.shape.saveEvaluation.implement(
        PouchDbClient.saveEvaluationWith({
          pouchDb: PouchDbClient.pouchDb,
          logger: readStateLogger.child("db"),
        }),
      ),
    ),
  },
  logger: readStateLogger,
});

/**
 * default writeInteraction that works OOTB
 * - Uses Warp Sequencer
 * - Use arweave.net gateway
 * - use arbundles createData for signing
 */
export const writeInteraction = writeInteractionWith({
  loadTransactionMeta: loadTransactionMetaWith({ fetch, GATEWAY_URL }),
  mu: {
    writeInteraction: fromPromise(
      muClientSchema.shape.writeInteraction.implement(
        MuClient.writeInteractionWith({
          fetch,
          MU_URL,
          CU_URL,
        }),
      ),
    ),
    signInteraction: fromPromise(
      muClientSchema.shape.signInteraction.implement(
        MuClient.signInteractionWith({
          createDataItem: MuClient.createData,
        })
      )
    ),
  },
  logger,
});
