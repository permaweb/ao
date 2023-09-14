import { describe, test } from "node:test";
import * as assert from "node:assert";

import { verifyContractWith } from "./verify-contract.js";
import { Resolved } from "hyper-async";

const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

describe("verify-contract", () => {
  test("verify contract is a smartweave contract", async () => {
    const verifyContract = verifyContractWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [
            { name: "Contract-Src", value: "foobar" },
            { name: "App-Name", value: "SmartWeaveContract" },
            { name: "App-Version", value: "0.3.0" },
        ] }),
    });

    await verifyContract({ id: CONTRACT }).toPromise()
      .then(assert.ok)
      .catch(() => assert("unreachable. Should have succeeded"));
  });

  test("throw if the Contract-Src tag is not provided", async () => {
    const verifyContract = verifyContractWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [
            { name: "App-Name", value: "SmartWeaveContract" },
            { name: "App-Version", value: "0.3.0" },
        ] }),
    });

    await verifyContract({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });

  test("throw if the App-Name tag is not provided", async () => {
    const verifyContract = verifyContractWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [
            { name: "Contract-Src", value: "foobar" },
            { name: "App-Version", value: "0.3.0" },
        ] }),
    });

    await verifyContract({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });

  test("throw if multiple tags not provided", async () => {
    const verifyContract = verifyContractWith({
      loadTransactionData: (_id) =>
        Resolved(new Response(JSON.stringify({ hello: "world" }))),
      loadTransactionMeta: (_id) =>
        Resolved({ tags: [
            { name: "App-Version", value: "0.3.0" },
        ] }),
    });

    await verifyContract({ id: CONTRACT }).toPromise()
      .then(() => assert("unreachable. Should have thrown"))
      .catch(assert.ok);
  });
});
