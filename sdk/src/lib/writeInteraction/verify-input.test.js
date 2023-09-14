import { describe, test } from "node:test";
import * as assert from "node:assert";

import { verifyInputWith } from "./verify-input.js";

describe("verify-input", () => {
  test("verify input to a writeInteraction", async () => {
    const verifyInput = verifyInputWith();

    await verifyInput({
      input: { function: "FUNCTION_STRING", data: { test: "test" } },
    }).toPromise()
      .then(assert.ok)
      .catch(assert.fail);
  });

  test("fail to provide a function to a write interaction", async () => {
    const verifyInput = verifyInputWith();

    await verifyInput({ data: { test: "test" } }).toPromise()
      .then(() => assert("unreachable. Should have failed"))
      .catch(assert.ok);
  });
});
