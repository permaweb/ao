# `ao` Scheduler Unit

This is an spec compliant `ao` Scheduler Unit, implemented as a Rust actix web server.

<!-- toc -->

- [Prerequisites](#prerequisites)
- [Database setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Setup and run local development server with hot reloading](#setup-and-run-local-development-server-with-hot-reloading)
  - [Run the binary already in this repo](#run-the-binary-already-in-this-repo)
  - [Tests](#tests)
  - [Compiling a binary (mainly for production/other live environments)](#compiling-a-binary-mainly-for-productionother-live-environments)
  - [Running the binary, su MODE](#running-the-binary-su-mode)
  - [Running a router in front of multiple scheduler units](#running-a-router-in-front-of-multiple-scheduler-units)
  - [Running the binary, router MODE](#running-the-binary-router-mode)

<!-- tocstop -->

## Prerequisites
- PostgreSQL 14 or higher, and a database called `su`
- Rust and Cargo version 1.75.0 https://www.rust-lang.org/tools/install (unless you are just planning to run the binary)


## Database setup
- The server will migrate the database at startup but you must create a postgres database called `su` and provide the url for it in the `DATABASE_URL` environment variable described below


## Environment Variables

Create a .env file with the following variables, or set them in the OS:

- `SU_WALLET_PATH` a local filepath to an arweave wallet the SU will use to write tx's
- `DATABASE_URL` a postgres database url, you must have a postgres database called `su`
- `DATABASE_READ_URL` an optional separate postgres database url for reads
- `GATEWAY_URL`an arweave gateway url to write to `https://arweave.net/`
- `UPLOAD_NODE_URL` an uploader url such as `https://up.arweave.net`
- `MODE` can be either value `su` or `router` but for local development use `su`
- `SCHEDULER_LIST_PATH` a list of schedulers only used for `router` MODE. Ignore when in `su` MODE, just set it to `""`.

> You can also use a `.env` file to set environment variables when running in
> development mode, See the `.env.example` for an example `.env`

## Usage


### Setup and run local development server with hot reloading
```sh
cargo install systemfd cargo-watch
systemfd --no-pid -s http::8999 -- cargo watch -x 'run su 9000'
```

or

### Run the binary already in this repo

You can run the binary that is already in the repository if your machine is compatible. It is built for the x86_64 architecture and runs on Linux. This requires no rust environment only the database and environment variables.
```sh
./su su 9000
```

### Tests

You can execute unit tests by running `cargo test`


### Compiling a binary (mainly for production/other live environments)

To build with docker on your local machine delete all su images and containers if you have previously run this, then run

```sh
docker system prune -a
docker build --target builder -t su-binary .
docker create --name temp-container su-binary
docker cp temp-container:/usr/src/su/target/x86_64-unknown-linux-musl/release/su .
```

This will create the static binary called su which can be pushed to the repo for deployment or used directly.


### Running the binary, su MODE

Can run directly in the terminal (for compatible machines)
```sh
./su su 9000
```

Or in Docker
```sh
cp .env.example .env.su
docker build -t su-runner .
docker run --env-file .env.su -v ./.wallet.json:/app/.wallet.json su-runner su 9000
```

When running the static binary in docker you will need to make sure the environment
variables are set in the container. If not see a NotPresent error you are missing the 
environment variables. You will also need to make sure the database url is accessible 
in the container. 

- `SU_WALLET_PATH` a local filepath to an arweave wallet the SU will use to write tx's
- `DATABASE_URL` a postgres database url, you must create a postgres database called `su`
- `GATEWAY_URL`an arweave gateway url to write to `https://arweave.net/`
- `UPLOAD_NODE_URL` an uploader url such as `https://up.arweave.net`
- `MODE` can be either value `su` or `router` but for local development use `su`
- `SCHEDULER_LIST_PATH` a list of schedulers only used for `router` MODE. Ignore in `su` mode just set it to `""`.


### Running a router in front of multiple scheduler units
If you have multiple scheduler units running you can run a su in router mode to act as a single 
entrypoint for all of them. 

First in the environment for this node, set the `SCHEDULER_LIST_PATH` variable to a json file containing a list of the su urls. The json file should look like the below - 

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

When running the static binary in docker you will need to make sure the environment
variables are set in the container as well.

### Running the binary, router MODE

Can run directly in the terminal (for compatible machines)
```sh
./su router 9000
```

Or in Docker
```sh
cp .env.example .env.router
docker build -t su-runner .
docker run --env-file .env.router -v ./.wallet.json:/app/.wallet.json -v ./schedulers.json:/app/.schedulers.json su-runner router 9000
```


# System Requirements for SU + SU-R cluster

The SU + SU-R runs as a cluster of nodes. The SU-R acts as a redirector to a set of SU's. In order to run the cluster you need at least 2 nodes. 1 SU and one SU-R (a SU running in router mode). In order for the SU-R to initialize properly when it boots up, it has to be started up with a configured set of SU's in the SCHEDULER_LIST_PATH environment variable.

So the workflow for setting up the SU/SU-R cluster properly the workflow is, start a set of SU nodes, configure the SU-R SCHEDULER_LIST_PATH with all the nodes, and then start the SU-R. To add more SU's later just add them into the SCHEDULER_LIST_PATH and reboot the SU-R.

The production SU is a Rust application built into a binary which can be run with the RunDockerfile. The SU-R can be run with the RunRouterDockerfile. They currently run on port 9000 so will require a web server to point to 9000. These containers need to have the ability to copy defined secret files .wallet.json and .schedulers.json into their container when deploying and also have a set of environment variables.

Lastly the SU and SU-R require a postgresql database for each node that is already initialized with the database name being "su" upon the first deployment. Deployments will migrate themselves at server start up. Each SU and SU-R should have its own database URL.

In summary the SU + SU-R requirements are
- A docker environment to run 2 different dockerfiles
- A server pointing to port 9000
- Ablity to define and modify secrect files availabe in the same path as the dockerfiles, .wallet.json and .schedulers.json
- Environement variables available in the container.
- a postgresql database per node, defined with a database called "su" at the time of deployment.
