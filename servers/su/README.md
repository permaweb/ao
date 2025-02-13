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
- [Migrations](#migrations)
  - [Migrating data to disk for an existing su instance](#migrating-data-to-disk-for-an-existing-su-instance)
  - [Migrating data to fully local data store](#migrating-data-to-fully-local-data-store)

<!-- tocstop -->

## Prerequisites
- PostgreSQL 14 or higher, and a database called `su`
- Rust and Cargo version 1.75.0 https://www.rust-lang.org/tools/install (unless you are just planning to run the binary)
- Clang and LLVM


## Database setup
- The server will migrate the database at startup but you must create a postgres database called `su` and provide the url for it in the `DATABASE_URL` environment variable described below


## Environment Variables

Create a .env file with the following variables, or set them in the OS:

- `SU_WALLET_PATH` a local filepath to an arweave wallet the SU will use to write tx's
- `DATABASE_URL` a postgres database url, you must have a postgres database called `su`
- `DATABASE_READ_URL` an optional separate postgres database url for reads
- `GRAPHQL_URL`an url for the arweave graphql interface `https://arweave-search.goldsky.com`
- `ARWEAVE_URL`an arweave gateway url to fetch actual transactions and network info from `https://arweave.net/`
- `GATEWAY_URL`an default fallback for the above 2. Must provide graphql, network info, and tx fetching.
- `UPLOAD_NODE_URL` an uploader url such as `https://up.arweave.net`
- `MODE` can be either value `su` or `router` but for local development use `su`
- `SCHEDULER_LIST_PATH` a list of schedulers only used for `router` MODE. Ignore when in `su` MODE, just set it to `""`.
- `DB_WRITE_CONNECTIONS` how many db connections in the writer pool,defaults to 10
- `DB_READ_CONNECTIONS` how many db connections in the reader pool, default to 10
- `USE_DISK` whether or not to write and read rocksdb, this is a performance enhancement for the data storage layer
- `SU_DATA_DIR` if `USE_DISK` is `true`, this is where rocksdb will be initialized
- `MIGRATION_BATCH_SIZE` when running the migration binary how many to fetch at once from postgres
- `ENABLE_METRICS` enable application level prometheus metrics to be available on the  `/metrics` endpoint
- `MAX_READ_MEMORY` max size in bytes of the message list returned on the /txid endpoint. Defaults to 1GB
- `PROCESS_CACHE_SIZE` max size of the in memory cache of processes held by the data store
- `ENABLE_PROCESS_ASSIGNMENT` enables AOP-6 boot loader, if enabled, the Process on a new spawn will become the first Message/Nonce in its message list. It will get an Assignment.
- `ARWEAVE_URL_LIST` list of arweave urls that have tx access aka url/txid returns the tx. Used by gateway calls for checking transactions etc...
- `SU_FILE_SYNC_DB_DIR` a directory for a RocksDB backup that will hold the full binary files that are the bundles, messages, and assignments. Only used by the cli binary.
- `SU_INDEX_SYNC_DB_DIR` a directory for a RocksDB backup that will hold an index of Processes and Messages for ordering and querying. Only used by the cli binary.

## Experimental environment variables
To use the expirimental fully local storage system set the following evnironment variables.
- `USE_LOCAL_STORE`  if true the SU will operate on purely RocksDB
- `SU_FILE_DB_DIR` a local RocksDB directory of bundles
- `SU_INDEX_DB_DIR` a local index of processes and messages

> You can also use a `.env` file to set environment variables when running in
> development mode, See the `.env.example` for an example `.env`

## Usage


### Setup and run local development server with hot reloading
```sh
cargo install systemfd cargo-watch
systemfd --no-pid -s http::8999 -- cargo watch -x 'run --bin su su 9000'
```

or

### Run the binary already in this repo

You can run the binary that is already in the repository if your machine is compatible. It is built for the x86_64 architecture and runs on Linux. You must have Clang and LLVM on the machine
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
docker cp temp-container:/usr/src/su/target/release/su .
```

This will create the binary called su which can be pushed to the repo for deployment or used directly. This is no longer a static binary and requires external libraries like Clang and LLVM.


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

When running the binary in docker you will need to make sure the environment
variables are set in the container. If not see a NotPresent error you are missing the 
environment variables. You will also need to make sure the database url is accessible 
in the container. See the environment variables you must set in the Environment Variables 
section above. 



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

When running the binary in docker you will need to make sure the environment
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

## Migrations

Over time the su database has evolved. It started as only Postgres then went to Postgres + RocksDB for performance enhancement. It now has a purely RocksDB implementation. For existing su's that already have data, you can follow the below to migration processes to bring it up to date to the latest implementation. 


Building the cli binary, delete all su images and containers if you have previously run this, then run
```sh
docker system prune -a
docker build --target cli-builder -t cli-binary -f DockerfileCli .
docker create --name temp-container-cli cli-binary
docker cp temp-container-cli:/usr/src/cli/target/release/cli .
```

### Migrating data to disk for an existing su instance
If a su has been running using postgres for sometime there may be performance issues. Writing to  and reading files from disk has been added. In order to switch this on set the environment variables

- `USE_DISK` whether or not to read and write binary files from/to the disk/rocksdb. If the su has already been running for a while the data will need to be migrated using the mig binary before turning this on.
- `SU_DATA_DIR` the data directory on disk where the su will read from and write binaries to

Then the `cli` binary can be used to migrate data in segments from the existing db. It will currently only migrate the message files to the disk. It takes a range which represents a range in the messages table. So 0-500 would grab the first 500 messages from the messages table and write them to rocksdb on the disk and so on. Just 0 as an argument would read the whole table, the range is so you can run multiple instances of the program on different segments of data for faster migration. To read from record 1000 to the end of the table you would just send 1000 as an argument.

Migrate the entire messages table to disk
```sh
./cli migrate_to_disk 0
```

Migrate the first 1000 messages
```sh
./cli migrate_to_disk 0-1000
```

Migrate from 1000 to the end of the table
```sh
./cli migrate_to_disk 1000
```

### Migrating data to fully local data store
If a su has been running using postgres + rocksdb using the above migration, it can then be migrated to using purely RocksDB in a totally local data store. Use the following environment variables to configure this. Set `USE_LOCAL_STORE` to false while running the migration then once it is complete set it to true.

- `USE_LOCAL_STORE` If set to true, the su will use a purely rocksdb data storage implementation.
- `SU_FILE_DB_DIR` a directory for a RocksDB instance that will hold the full binary files that are the bundles, messages, and assignments.
- `SU_INDEX_DB_DIR` a directory for a RocksDB instance that will hold an index of Processes and Messages for ordering and querying.

Then the `cli` binary can be used to migrate data in segments from the existing source. Note that you must have already run the above `cli` binary with `migrate_to_disk` before running it with `migrate_to_local` will work. It cannot migrate from a purely postgres implementation. So to get to this point if the su was running on only postgres, first follow the above steps using the `cli` binary with `migrate_to_disk`. And then follow the  `migrate_to_local` steps.

Migrate all Messages and Processes to RocksDB
```sh
./cli migrate_to_local
```


### Keeping a backup database in sync with a running SU
There is a program available to keep another directory in sync with a running SU, copy the environment variables from the running su and add these, and then run the cli binary with the `sync_local_drives` argument. This is to keep 2 fully local data stores in sync.

- `SU_FILE_SYNC_DB_DIR` a directory for a RocksDB backup that will hold the full binary files that are the bundles, messages, and assignments.
- `SU_INDEX_SYNC_DB_DIR` a directory for a RocksDB backup that will hold an index of Processes and Messages for ordering and querying.

Keep the sync db directories up to date with a running SU on a 5 second interval
```sh
./cli sync_local_drives 5
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
