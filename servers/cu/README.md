# `ao` Compute Unit

This is an spec compliant `ao` Compute Unit, implemented as a Node Express Server.

<!-- toc -->

- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Debug Logging](#debug-logging)

<!-- tocstop -->

## Usage

First install dependencies using `npm i`

Then simply start the server using `npm start` or `npm run dev` if you are working on the project locally. This will start a hot-reload process listening on port `3005` by default.

## Environment Variables

There are a few environment variables that you can set:

- `GATEWAY_URL`: Which Arweave Gateway to use (defaults to `arweave.net` in development mode)
- `SEQUENCER_URL`: Which Sequencer to use (defaults to the `Warp` Gateway in development mode)
- `PORT`: Which port the web server should listen on (defaults to port `3005`)

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Web Server, by setting the `DEBUG` environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-cu*`. You can use wildcards to enable a subset of logs ie. `ao-cu:readState*`
