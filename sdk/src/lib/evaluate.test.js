import { describe, test } from "node:test";
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { Resolved } from "hyper-async";

import { evaluateWith } from "./evaluate.js";

describe("evaluate", () => {
  test("evaluate state and add output to context", async () => {
    let cacheCount = 0;
    const env = {
      db: {
        saveInteraction: (interaction) => {
          cacheCount++;
          return Resolved(interaction);
        },
      },
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/state-contract.wasm"),
      state: { balances: { "1": 1 } },
      actions: [
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "a",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "b",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "c",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "d",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "e",
        },
      ],
      SWGlobal: {},
    };

    const res = await evaluate(ctx).toPromise();
    console.log(res);
    assert.equal(cacheCount, 5);
    assert.ok(res.output);
  });

  test("save each interaction", async () => {
    let cacheCount = 0;
    const env = {
      db: {
        saveInteraction: (interaction) => {
          cacheCount++;
          return Resolved();
        },
      },
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/state-contract.wasm"),
      state: { balances: { "1": 1 } },
      actions: [
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "a",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "b",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "c",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "d",
        },
        {
          action: { caller: "1", input: { function: "balance" } },
          sortKey: "e",
        },
      ],
      SWGlobal: {},
    };

    const res = await evaluate(ctx).toPromise();
    assert.equal(cacheCount, 5);
  });

  test("noop the initial state", async () => {
    const env = {
      db: {
        saveInteraction: (interaction) =>
          assert.fail("cache should not be interacted with on a noop of state"),
      },
    };

    const evaluate = evaluateWith(env);

    const ctx = {
      id: "ctr-1234",
      from: "sort-key-start",
      src: readFileSync("./test/state-contract.wasm"),
      state: { balances: { "1": 1 } },
      actions: [],
      SWGlobal: {},
    };

    const { output } = await evaluate(ctx).toPromise();
    assert.deepStrictEqual(output, {
      state: { balances: { "1": 1 } },
    });
  });
});
