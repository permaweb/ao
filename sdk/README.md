# AO SDK

This sdk will run in a browser or server environment, the purpose is to abstract interacting
with the infrastructure needed for deploying, evaluating, and interacting with `ao` Smart Contracts.

- Reads state from a `ao` Compute Unit `cu`
- Writes interactions to an `ao` Message Unit `mu`
- Deploys Contracts to the `warp` gateway

# Testing

Run `npm test` to run the tests.

To enable debug logging, set the `DEBUG` environment variable to the logs you're
interested in. All logging is coped under the name `@permaweb/ao-sdk`

Run `npm run test:integration` to run the integration tests.
