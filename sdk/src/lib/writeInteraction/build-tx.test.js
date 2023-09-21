import { describe, test } from "node:test";
import * as assert from "node:assert";
import { Resolved } from "hyper-async";

import { buildTxWith } from "./build-tx.js";
import { tap } from "ramda";

describe("build-tx", () => {
  test("build and sign a tx", async () => {
    const buildTx = buildTxWith({
      mu: {
        signInteraction: () => Resolved({ fakeDataItem: "fake" }),
      },
    });

    await buildTx({ id: "asdf", input: { function: "noop" } }).toPromise()
      .then(assert.ok)
      .catch(assert.fail);
  });
});
