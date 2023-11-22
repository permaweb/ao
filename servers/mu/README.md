# `ao` Messanger Unit

> 🚧 Under Construction

This is an spec compliant `ao` Messenger Unit, implemented as a Node Express
Server.

<!-- toc -->

- [Getting Started](#getting-started)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Debug Logging](#debug-logging)

<!-- tocstop -->

## Getting Started

You will need a Postgres database running. For convenience, a Postgres
`Dockefile` and configuration is included in the `.postgres` directory that you
can use to spin up a local Postgres instance

> The `.postgres` directory is purely a convenience for local development

> If you use Gitpod, this is already done for you, as part of spinning up a new
> workspace

First, build the image by running this at the root of the `mu` module:

```sh
docker build -t mu-postgres .postgres
```

Then start up a container using that image. You can optionally mount a local
directory for Postgres to store persistent data ie. `/workspace/mu-data`

```sh
mkdir -p /workspace/mu-data
docker run -it \
  -p 5432:5432 \
  -v /workspace/mu-data:/var/lib/postgresql/data \
  --env-file .postgres/postgres.conf \
  mu-postgres
```

This will start a Postgres database listening on port `5432` with credentials in
the `./postgres/postgres.conf` file

## Usage

First install dependencies using `npm i`

Then simply start the server using `npm start` or `npm run dev` if you are
working on the project locally. This will start a hot-reload process listening
on port `3005` by default.

## Environment Variables

There are a few environment variables that you can set:

- `CU_URL`: Which `ao` Compute Unit to use (defaults to
  `https://ao-cu-2.onrender.com` in development mode)
- `SEQUENCER_URL`: Which Sequencer to use (defaults to
  `https://ao-su-1.onrender.com` in development mode)
- `PORT`: Which port the web server should listen on (defaults to port `3005`)
- `PATH_TO_WALLET`: the path to the wallet JWK interface you would like the `mu`
  to use to sign messages that it is cranking (defaults to `./wallet.json` in
  development mode)
- `MU_DATABASE_URL`: the connection string for the MU database (defaults to
  `postgres://admin:admin@localhost:5432/mu` in development mode)

> You can also use a `.env` file to set environment variables when running in
> development mode, See the `.env.example` for an example `.env`

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Web Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-mu*`
