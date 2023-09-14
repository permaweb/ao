import { describe, test } from "node:test";
import assert from "node:assert";

import { createLogger } from "../logger.js";
import { dbClientSchema } from "../dal.js";
import { findLatestInteractionWith, saveInteractionWith } from "./pouchdb.js";

const logger = createLogger("db");

describe("pouchdb", () => {
  describe("findLatestInteraction", () => {
    test("return the lastest interaction", async () => {
      const createdAt = new Date().toISOString();
      const findLatestInteraction = dbClientSchema.shape.findLatestInteraction
        .parse(findLatestInteractionWith({
          pouchDb: {
            find: async (op) => {
              assert.deepStrictEqual(op, {
                selector: { _id: { $lte: "contract-123,sortkey-910" } },
                sort: [{ _id: "desc" }],
                limit: 1,
              });
              return {
                docs: [
                  {
                    _id: "contract-123,sortkey-890",
                    sortKey: "sortkey-890",
                    parent: "contract-123",
                    action: { input: { function: "noop" } },
                    output: { state: { foo: "bar" } },
                    createdAt,
                  },
                ],
              };
            },
          },
          logger,
        }));

      const res = await findLatestInteraction({
        id: "contract-123",
        to: "sortkey-910",
      });

      assert.equal(res.sortKey, "sortkey-890");
      assert.equal(res.parent, "contract-123");
      assert.equal(res.parent, "contract-123");
      assert.deepStrictEqual(res.action, { input: { function: "noop" } });
      assert.deepStrictEqual(res.output, { state: { foo: "bar" } });
      assert.equal(res.createdAt.toISOString(), createdAt);
    });

    test("rejects if no interaction is found", async () => {
      const findLatestInteraction = findLatestInteractionWith({
        pouchDb: {
          find: async () => ({ docs: [] }),
        },
        logger,
      });
      await findLatestInteraction({ id: "contract-123", to: "sortkey-910" })
        .then(assert.fail)
        .catch(() => assert.ok(true));
    });
  });

  describe("saveInteraction", () => {
    test("save the interaction to pouchdb", async () => {
      const createdAt = new Date().toISOString();
      const saveInteraction = dbClientSchema.shape.saveInteraction.parse(
        saveInteractionWith({
          pouchDb: {
            get: async () => undefined,
            put: (doc) => {
              assert.equal(doc._id, "contract-123,sortkey-890");
              assert.equal(doc.sortKey, "sortkey-890");
              assert.equal(doc.parent, "contract-123");
              assert.deepStrictEqual(doc.action, {
                input: { function: "noop" },
              });
              assert.deepStrictEqual(doc.output, { state: { foo: "bar" } });
              assert.equal(doc.createdAt.toISOString(), createdAt);
              return Promise.resolve(true);
            },
          },
          logger,
        }),
      );

      await saveInteraction({
        sortKey: "sortkey-890",
        parent: "contract-123",
        action: { input: { function: "noop" } },
        output: { state: { foo: "bar" } },
        createdAt,
      });
    });

    test("noop if the interaction already exists", async () => {
      const saveInteraction = dbClientSchema.shape.saveInteraction.parse(
        saveInteractionWith({
          pouchDb: {
            get: async () => ({
              _id: "contract-123,sortkey-890",
              sortKey: "sortkey-890",
              parent: "contract-123",
              action: { input: { function: "noop" } },
              output: { state: { foo: "bar" } },
              createdAt: new Date(),
            }),
            put: assert.fail,
          },
          logger,
        }),
      );

      await saveInteraction({
        sortKey: "sortkey-890",
        parent: "contract-123",
        action: { input: { function: "noop" } },
        output: { state: { foo: "bar" } },
        createdAt: new Date(),
      });
    });
  });
});
