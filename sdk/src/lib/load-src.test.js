import test from "node:test";
import * as assert from "node:assert";

import { GET_CONTRACT_QUERY, loadSourceWith } from "./load-src.js";

const CONTRACT = "zc24Wpv_i6NNCEdxeKt7dcNrqL5w0hrShtSCcFGGL24";

test("return contract source and contract id", async () => {
  const loadSource = loadSourceWith({ fetch });
  const result = await loadSource({ id: CONTRACT }).toPromise();
  assert.ok(result.src.byteLength === 214390);
  assert.equal(result.id, CONTRACT);
  assert.ok(true);
});

test("pass the correct request", async () => {
  const loadSource = loadSourceWith({
    fetch: async (url, options) => {
      if (url.endsWith("/graphql")) {
        const body = JSON.parse(options.body);
        assert.deepStrictEqual(body, {
          query: GET_CONTRACT_QUERY,
          variables: { contractId: CONTRACT },
        });

        return new Response(JSON.stringify({
          "data": {
            "transactions": {
              "edges": [
                {
                  "node": {
                    "tags": [
                      {
                        "name": "App-Name",
                        "value": "SmartWeaveContract",
                      },
                      {
                        "name": "App-Version",
                        "value": "0.3.0",
                      },
                      {
                        "name": "Contract-Src",
                        "value": "gnVg6A6S8lfB10P38V7vOia52lEhTX3Uol8kbTGUT8w",
                      },
                      {
                        "name": "SDK",
                        "value": "Warp",
                      },
                      {
                        "name": "Nonce",
                        "value": "1693579974165",
                      },
                      {
                        "name": "Content-Type",
                        "value": "application/json",
                      },
                    ],
                  },
                },
              ],
            },
          },
        }));
      }

      return new Response(JSON.stringify({ byteLength: 214390 }));
    },
  });

  await loadSource({ id: CONTRACT }).toPromise();
});
