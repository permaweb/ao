import test from "node:test";
import assert from "node:assert/strict";

const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

test("load contract source", async () => {
  const { loadSource } = await import("./load-src.js");
  const result = await loadSource({ id: CONTRACT }).toPromise();
  assert.ok(result.src.byteLength === 214390);
  assert.ok(true);
});
