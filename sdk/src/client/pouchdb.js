import { fromPromise, of, Rejected, Resolved } from "hyper-async";
import { __, always, applySpec, head, prop, tap } from "ramda";
import { z } from "zod";

import PouchDb from "pouchdb";
import PouchDbFind from "pouchdb-find";
import NodeWebSql from "pouchdb-adapter-node-websql";
import WebSql from "pouchdb-adapter-websql";

/**
 * An implementation of the db client using pouchDB
 */

/**
 * Build a pouchDB instance based on the environment
 *
 * we inject this as part of the entrypoint, but injection
 * allows use to test business logic above using stubs
 */
const isBrowser = typeof window !== "undefined" &&
  typeof window.document !== "undefined";

const isNode = typeof process !== "undefined" &&
  process.versions != null &&
  process.versions.node != null;
let adapter;
if (isNode) adapter = NodeWebSql;
else if (isBrowser) adapter = WebSql;
else throw new Error("environment not supported");
PouchDb.plugin(adapter);
PouchDb.plugin(PouchDbFind);
const internalPouchDb = new PouchDb("ao-cache", { adapter: "websql" });

export { internalPouchDb as pouchDb };

const cachedInteractionDocSchema = z.object({
  _id: z.string().min(1),
  sortKey: z.string().min(1),
  parent: z.string().min(1),
  action: z.record(z.any()),
  output: z.object({
    state: z.record(z.any()).optional(),
    result: z.record(z.any()).optional(),
  }),
  createdAt: z.preprocess(
    (
      arg,
    ) => (typeof arg == "string" || arg instanceof Date ? new Date(arg) : arg),
    z.date(),
  ),
});

/**
 * PouchDB does Comparison of string using ICU which implements the Unicode Collation Algorithm,
 * giving a dictionary sorting of keys.
 *
 * This can give surprising results if you were expecting ASCII ordering.
 * See https://docs.couchdb.org/en/stable/ddocs/views/collation.html#collation-specification
 *
 * So we use a high value unicode character to terminate a range query prefix.
 * This will cause only string with a given prefix to match a range query
 */
export const COLLATION_SEQUENCE_MAX_CHAR = "\ufff0";

function createDocId({ contractId, sortKey }) {
  return [contractId, sortKey].join(",");
}

function createSelector({ contractId, to }) {
  /**
   * By using the max collation sequence, this will give us all docs whose _id
   * is prefixed with the contract id
   */
  const selector = {
    _id: {
      $gte: contractId,
      $lte: createDocId({ contractId, sortKey: COLLATION_SEQUENCE_MAX_CHAR }),
    },
  };
  /**
   * overwrite upper range with actual sortKey, since we have it
   */
  if (to) selector._id.$lte = createDocId({ contractId, sortKey: to });
  return selector;
}

export function findLatestInteractionWith(
  { pouchDb },
) {
  return ({ id, to }) => {
    return of({ contractId: id, to })
      .map(createSelector)
      .chain(fromPromise((selector) => {
        /**
         * Find the most recent interaction that produced state:
         * - sort key less than or equal to the sort key we're interested in
         *
         * This will give us the cached most recent interaction that produced a state change
         */
        return pouchDb.find({
          selector,
          sort: [{ _id: "desc" }],
          limit: 1,
        }).then((res) => {
          if (res.warning) console.warn(res.warning);
          return res.docs;
        });
      }))
      .map(head)
      .chain((doc) => doc ? Resolved(doc) : Rejected(doc))
      /**
       * Ensure the input matches the expected
       * shape
       */
      .map(cachedInteractionDocSchema.parse)
      .map(applySpec({
        sortKey: prop("sortKey"),
        parent: prop("parent"),
        action: prop("action"),
        output: prop("output"),
        createdAt: prop("createdAt"),
      }))
      .bichain(Resolved, Resolved)
      .toPromise();
  };
}

export function saveInteractionWith(
  { pouchDb, logger: _logger },
) {
  const logger = _logger.child("saveInteraction");
  return (interaction) => {
    return of(interaction)
      .map(applySpec({
        /**
         * The contractId concatenated with the sortKey
         * is used as the _id for the record
         */
        _id: (interaction) =>
          createDocId({
            contractId: interaction.parent,
            sortKey: interaction.sortKey,
          }),
        sortKey: prop("sortKey"),
        parent: prop("parent"),
        action: prop("action"),
        output: prop("output"),
        createdAt: prop("createdAt"),
      }))
      /**
       * Ensure the expected shape before writing to the db
       */
      .map(cachedInteractionDocSchema.parse)
      .chain((doc) =>
        of(doc)
          .chain(fromPromise((doc) => pouchDb.get(doc._id)))
          .bichain(
            (err) => {
              // No cached document found
              if (err.status === 404) {
                logger(
                  `No cached document found with _id %s. Caching interaction %O`,
                  doc._id,
                  doc,
                );
                return Resolved(undefined);
              }
              return Rejected(err);
            },
            Resolved,
          )
          .chain((found) =>
            found
              ? of(found)
              : of(doc).chain(fromPromise((doc) => pouchDb.put(doc)))
                .bimap(
                  logger.tap(`Encountered an error when caching interaction`),
                  logger.tap(`Cached interaction`),
                )
                .bichain(Resolved, Resolved)
          )
          .map(always(doc._id))
      )
      .toPromise();
  };
}
