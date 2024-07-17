# `ao` Messanger Unit

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
- `GRAPHQL_URL`: The url for the Arweave Gateway GraphQL server to be used by the MU. (defaults to https://arweave.net/graphql)
- `PATH_TO_WALLET`: the path to the wallet JWK interface you would like the `mu`
  to use to sign messages that it is pushing
- `DEBUG`: if DEBUG=* or DEBUG=ao-mu* then verbose debug logs will be provided in the console.
- `UPLOADER_URL`: URL to upload service (defaults to https://up.arweave.net)
- `DB_URL`: URL to local sqlite database.
- `TASK_QUEUE_MAX_RETRIES`: The amount of attempts for the tasks queue to process a message.
- `TASK_QUEUE_RETRY_DELAY`: The retry in between each attempt to process a message in the task queue.

> You can also use a `.env` file to set environment variables when running in
> development mode, See the `.env.example` for an example `.env`

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Web Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-mu*`
