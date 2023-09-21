import { describe, test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { Resolved } from "hyper-async";

import { createLogger } from "../../logger.js";
import { evaluateWith } from "./evaluate.js";

const logger = createLogger("@permaweb/ao-sdk:readState");

describe("evaluate", () => {
  test("evaluate state and add output to context", async () => {
    const env = {
      db: {
        saveEvaluation: (interaction) => Resolved(interaction),
      },
      logger,
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/contracts/happy/contract.wasm"),
      state: {},
      actions: [
        {
          action: { input: { function: "hello" } },
          sortKey: "a",
          SWGlobal: {},
        },
        {
          action: { input: { function: "world" } },
          sortKey: "b",
          SWGlobal: {},
        },
      ],
    };

    const res = await evaluate(ctx).toPromise();
    console.log(res);
    assert.ok(res.output);
    assert.deepStrictEqual(res.output, {
      state: { heardHello: true, heardWorld: true, happy: true },
    });
  });

  test("save each interaction", async () => {
    let cacheCount = 0;
    const env = {
      db: {
        saveEvaluation: (interaction) => {
          cacheCount++;
          return Resolved();
        },
      },
      logger,
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/contracts/happy/contract.wasm"),
      state: { balances: { "1": 1 } },
      actions: [
        {
          action: { input: { function: "hello" } },
          sortKey: "a",
          SWGlobal: {},
        },
        {
          action: { input: { function: "world" } },
          sortKey: "b",
          SWGlobal: {},
        },
        {
          action: { input: { function: "hello" } },
          sortKey: "c",
          SWGlobal: {},
        },
        {
          action: { input: { function: "world" } },
          sortKey: "d",
          SWGlobal: {},
        },
        {
          action: { input: { function: "hello" } },
          sortKey: "e",
          SWGlobal: {},
        },
      ],
    };

    await evaluate(ctx).toPromise();
    assert.equal(cacheCount, 5);
  });

  test("noop the initial state", async () => {
    const env = {
      db: {
        saveEvaluation: (interaction) =>
          assert.fail("cache should not be interacted with on a noop of state"),
      },
      logger,
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/contracts/happy/contract.wasm"),
      state: { balances: { "1": 1 } },
      actions: [],
    };

    const { output } = await evaluate(ctx).toPromise();
    assert.deepStrictEqual(output, {
      state: { balances: { "1": 1 } },
    });
  });

  test('error returned in contract result', async () => {
    const env = {
      db: { saveEvaluation: assert.fail },
      logger,
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/contracts/sad/contract.wasm"),
      state: {},
      actions: [
        {
          // Will include an error in result.error
          action: { input: { function: "errorResult" } },
          sortKey: "a",
          SWGlobal: {},
        }
      ],
    };

    const res = await evaluate(ctx).toPromise();
    assert.ok(res.output);
    assert.deepStrictEqual(res.output, {
      result: {
        error: { code: 123, message: 'a handled error within the contract' }
      }
    });
  })

  test('error thrown by contract', async () => {
    const env = {
      db: { saveEvaluation: assert.fail },
      logger,
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/contracts/sad/contract.wasm"),
      state: {},
      actions: [
        {
          // Will intentionally throw from the lua contract
          action: { input: { function: "errorThrow" } },
          sortKey: "a",
          SWGlobal: {},
        }
      ],
    };

    const res = await evaluate(ctx).toPromise();
    assert.ok(res.output);
    assert.deepStrictEqual(res.output, {
      result: {
        error: { code: 123, message: 'a thrown error within the contract' }
      }
    });
  })

  test('error unhandled by contract', async () => {
    const env = {
      db: { saveEvaluation: assert.fail },
      logger,
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/contracts/sad/contract.wasm"),
      state: {},
      actions: [
        {
          // Will unintentionally throw from the lua contract
          action: { input: { function: "errorUnhandled" } },
          sortKey: "a",
          SWGlobal: {},
        }
      ],
    };

    const res = await evaluate(ctx).toPromise();
    console.log(res.output)
    assert.ok(res.output);
    assert.ok(res.output.result.error)
  })
});
