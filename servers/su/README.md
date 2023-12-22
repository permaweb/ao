# `ao` Scheduler Unit

This is an spec compliant `ao` Scheduler Unit, implemented as a Rust actix web server.

<!-- toc -->

- [Prerequisites](#prerequisites)
- [Database setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Setup and run local development server with hot reloading](#setup-and-run-local-development-server-with-hot-reloading)
  - [Tests](#tests)
  - [Compiling a binary (mainly for production/other live environments)](#compiling-a-binary-mainly-for-productionother-live-environments)
  - [Running the binary, su MODE](#running-the-binary-su-mode)
  - [Running a router in front of multiple scheduler units](#running-a-router-in-front-of-multiple-scheduler-units)
  - [Running the binary, router MODE](#running-the-binary-router-mode)

<!-- tocstop -->

## Prerequisites
- PostgreSQL 14 or higher, and a database called `su`
- Rust and Cargo https://www.rust-lang.org/tools/install


## Database setup
- The server will migrate the database at startup but you must create a postgres database called `su` and provide the url for it in the `DATABASE_URL` environment variable described below


## Environment Variables

Create a .env file with the following variables, or set them in the OS:

- `SU_WALLET_PATH` a local filepath to an arweave wallet the SU will use to write tx's
- `DATABASE_URL` a postgres database url, you must have a postgres database called `su`
- `GATEWAY_URL`an arweave gateway url to write to `https://arweave.net/`
- `UPLOAD_NODE_URL` an uploader url such as `https://up.arweave.net`
- `MODE` can be either value `su` or `router` but for local development use `su`
- `SCHEDULER_LIST_PATH` a list of schedulers only used for `router` MODE. Ignore when in `su` MODE


## Usage


### Setup and run local development server with hot reloading
```sh
cargo install systemfd cargo-watch
systemfd --no-pid -s http::8999 -- cargo watch -x 'run su 9000'
```

### Tests

You can execute unit tests by running `cargo test`


### Compiling a binary (mainly for production/other live environments)

To build with docker on your local machine delete all images and containers if you have previously run this

```sh
docker system prune -a
docker build -t su-app .
docker create --name temp-container su-app
docker cp temp-container:/usr/src/su/target/x86_64-unknown-linux-musl/release/su .
```

This will create a static binary called su which can be pushed to the repo for deployment


### Running the binary, su MODE
```sh
docker build -f RunDockerfile -t su-runner .
docker run --name su-app su-runner
```

When running the static binary in docker you will need to make sure the environment
variables are set in the container

- `SU_WALLET_PATH` a local filepath to an arweave wallet the SU will use to write tx's
- `DATABASE_URL` a postgres database url, you must create a postgres database called `su`
- `GATEWAY_URL`an arweave gateway url to write to `https://arweave.net/`
- `UPLOAD_NODE_URL` an uploader url such as `https://up.arweave.net`
- `MODE` can be either value `su` or `router` but for local development use `su`
- `SCHEDULER_LIST_PATH` a list of schedulers only used for `router` MODE. Ignore in su mode


### Running a router in front of multiple scheduler units
If you have multiple scheduler units running you can run a su in router mode to act as a single 
entrypoint for all of them. 

First in the environment for this node, set the `SCHEDULER_LIST_PATH` variable to a json file containing a list of the su urls. It should look like the below - 

```json
[
    {
        "url": "https://ao-su-1.onrender.com"
    },
    {
        "url": "https://ao-su-2.onrender.com"
    }
]
```

Also set the `MODE` environment variable to `router`

Now the url for the router can be used as a single entry point to all the sus. In this configuration all sus and the router should share the same wallet configured in the environment variable `SU_WALLET_PATH`

### Running the binary, router MODE
```sh
docker build -f RunDockerfile -t su-runner .
docker run --name su-app su-runner
```
