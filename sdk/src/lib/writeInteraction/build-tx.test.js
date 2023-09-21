import { describe, test } from "node:test";
import * as assert from "node:assert";

import { buildTxWith } from "./build-tx.js";

describe("build-tx", () => {
  test("build and sign a tx", async () => {
    const buildTx = buildTxWith({
      mu: {
        signInteraction: () => {
          return {
            createDataItem: async () => {
              return { fakeDataItem: "fake" };
            },
          };
        },
      },
    });

    await buildTx({ id: "asdf", input: { function: "noop" } }).toPromise()
      .then(assert.ok)
      .catch(assert.fail);
  });
});
