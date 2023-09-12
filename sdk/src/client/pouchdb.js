import { of, Rejected, Resolved } from "hyper-async";
import { __, always, applySpec, head, prop } from "ramda";
import { z } from "zod";

/**
 * An implementation of the db client using pouchDB
 */

const cachedInteractionDocSchema = z.object({
  _id: z.string().min(1),
  parent: z.string().min(1),
  createdAt: z.preprocess(
    (
      arg,
    ) => (typeof arg == "string" || arg instanceof Date ? new Date(arg) : arg),
    z.date(),
  ),
  action: z.record(z.any()),
  output: z.object({
    state: z.record(z.any()).optional(),
    result: z.record(z.any()).optional(),
  }),
  type: z.literal("interaction"),
});

export function findLatestInteraction({ id, to }) {
  // TODO: implement to fetch from PouchDB. Mock for now
  return of([])
    .map(head)
    .chain((doc) => doc ? Resolved(doc) : Rejected(doc))
    /**
     * Ensure the input matches the expected
     * shape
     */
    .map(cachedInteractionDocSchema.parse)
    .map(applySpec({
      id: prop("_id"),
      parent: prop("parent"),
      action: prop("action"),
      output: prop("output"),
      createdAt: prop("createdAt"),
    }))
    .bichain(Resolved, Resolved)
    .toPromise();
}

export function saveInteraction(interaction) {
  return of(interaction)
    /**
     * Ensure the output matches the expected
     * shape
     */
    .map(cachedInteractionDocSchema.parse)
    .map(applySpec({
      _id: prop("id"),
      parent: prop("parent"),
      action: prop("action"),
      output: prop("output"),
      createdAt: prop("createdAt"),
      type: always("interaction"),
    }))
    .chain((interactionDocs) => {
      // TODO: implement bulk save to PouchDB, mock for now
      return Resolved(interactionDocs);
    })
    .toPromise();
}
