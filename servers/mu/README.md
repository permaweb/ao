# `ao` Messenger Unit

This is an spec compliant `ao` Messenger Unit, implemented as a Node Express
Server.

<!-- toc -->

- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Debug Logging](#debug-logging)

<!-- tocstop -->

## Usage

First install dependencies using `npm i`

Then simply start the server using `npm start` or `npm run dev` if you are
working on the project locally. This will start a hot-reload process listening
on port `3005` by default.

## Environment Variables

There are a few environment variables that you can set:

- `CU_URL`: Which `ao` Compute Unit to use (defaults to
  `http://localhost:6363` in development mode)
- `PORT`: Which port the web server should listen on (defaults to port `3005`)
- `ENABLE_METRICS_ENDPOINT`: Whether the OpenTelemetry endpoint `/metrics` should be enabled. Set to any value to enable. (defaults to disabled)
- `GATEWAY_URL`: The url of the Arweave gateway to use. (Defaults to
  `https://arweave.net`)

> `GATEWAY_URL` is solely used as a fallback for both `ARWEAVE_URL` and
> `GRAPHQL_URL`, if not provided (see below).

- `ARWEAVE_URL`: The url for the Arweave http API server, to be used by the CU
  to fetch transaction data from Arweave, specifically ao `Modules`, and
  `Message` `Assignment`s. (Defaults to `GATEWAY_URL`)
- `GRAPHQL_URL`: The url for the Arweave Gateway GraphQL server to be used by the MU. (Defaults to `${GATEWAY_URL}/graphql`)
- `PATH_TO_WALLET`: the path to the wallet JWK interface you would like the `mu`
  to use to sign messages that it is pushing
- `DEBUG`: if DEBUG=* or DEBUG=ao-mu* then verbose debug logs will be provided in the console.
- `UPLOADER_URL`: URL to upload service (defaults to https://up.arweave.net)
- `DB_URL`: URL to local sqlite database containing enqueued tasks.
- `TRACE_DB_URL`: URL to local sqlite database containing message log traces.
- `TASK_QUEUE_MAX_RETRIES`: The amount of attempts for the tasks queue to process a message.
- `TASK_QUEUE_RETRY_DELAY`: The retry in between each attempt to process a message in the task queue.
- `DISABLE_TRACE`: Whether or not the log tracer should be enabled. Set to any value to disable log tracing. (You must explicitly enable log tracing by setting - `DISABLE_TRACE` to `'false'`)
- `SPAWN_PUSH_ENABLED`: If enabled, this will make the MU attempt to push messages for a spawn as per AOP 6 Boot loader https://github.com/permaweb/ao/issues/730 
- `GET_RESULT_MAX_RETRIES`: The amount of attempts for the MU to get the result of a message from the CU.
- `GET_RESULT_RETRY_DELAY`: The retry delay in between each attempt to get the result of a message from the CU.
- `ENABLE_MESSAGE_RECOVERY`: Whether or not to enable message recovery.
- `MESSAGE_RECOVERY_MAX_RETRIES`: The amount of attempts for the MU to recover a message from the database.
- `MESSAGE_RECOVERY_RETRY_DELAY`: The retry delay in between each attempt to recover a message from the database.
- `ENABLE_PUSH`: Whether or not to allow the MU to push messages.
- `ENABLE_CUSTOM_PUSH`: Whether or not to allow custom CU URLs to be passed as a query param to the push endpoint.
- `CUSTOM_CU_MAP_FILE_PATH`: The file path for the custom CU JSON map for message pushing.
- `IP_WALLET_RATE_LIMIT`: The amount of requests from an IP-wallet pair to allow in an interval (defaults to 100)
- `IP_WALLET_RATE_LIMIT_INTERVAL`: The interval to allow the rate limit in (defaults to 1h)
- `SU_ROUTER_URL`: the SU router url to default to when checking if target is a wallet
- `HB_ROUTER_URL`: the HB router url to default to when checking if target is a wallet
- `ENABLE_HB_WALLET_CHECK`: whether to enable HB wallet check when checking if target is a wallet
- `HB_GRAPHQL_URL`: the HB graphql cache url to use when retrieving a process message
- `PROCESS_WHITELIST_URL`: HTTP(S) URL of the process whitelist JSON, refreshed every 5 minutes when configured
- `RATE_LIMIT_FILE_URL`: HTTP(S) URL of the rate-limit JSON, refreshed every 10 minutes when configured

### Private S3 configuration

Keep the existing HTTPS URLs for configuration files. Public HTTP(S) and S3 sources
continue to work without AWS credentials. An HTTP 403 from an AWS S3 REST endpoint
triggers a retry signed with the MU's IAM role credentials. Presigned URLs are used
unchanged. Signed requests do not follow redirects; use regional S3 REST URLs.

The AWS credential provider chain supports EC2 instance profiles and ECS task roles,
including automatic credential refresh. The region comes from the URL; for global
endpoints, S3's bucket-region header, `AWS_REGION`, `AWS_DEFAULT_REGION`, and `us-east-1`
are used in that order. No new URL format or static credentials in `.env` are required.
The role must have `s3:GetObject` access to the exact process whitelist and rate-limit
objects it reads. The MU does not read `mu-asg-ips.json`; that file is consumed by SU.
See the [SU private S3 setup](../su/README.md#private-s3-configuration) for IAM policy
and bucket migration details.

Configured files are fetched and validated before startup completes. A failed initial
load prevents startup. Later failures are logged and retain the last valid config,
including when S3 denies access or returns invalid JSON. An unset URL leaves that
configuration source disabled as before.
Queue workers receive the validated rate limits at startup and use the same
IAM-authenticated reader for their subsequent refreshes.



> You can also use a `.env` file to set environment variables when running in
> development mode, See the `.env.example` for an example `.env`

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Web Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-mu*`
