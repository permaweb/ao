# `ao` Unit Router

The `ao` Unit Router is a simple Reverse Proxying Service, used to facilitate and simulate a distributed `ao` Network. It is implemented as a simple NodeJS Service, using the popular, robust, and lightweight [`http-proxy`](https://www.npmjs.com/package/http-proxy) to manage Reverse Proxied Requests to the underlying host.

This service will deterministically route `ao` Process operations to an underlying host. In other words, a Process will always be routed to the same underlying `ao` Unit, according to it's index in the [`HOSTS` environment variable](#environment-variables). If, for whatever reason, the underlying host cannot be reached, the `ao` Unit Router will determinstically, and transparently, failover to the next underyling host. If all underlying hosts cannot be reached, the final err is returned in the response to the client.

<!-- toc -->

- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [Tests](#tests)
- [Debug Logging](#debug-logging)
- [Project Structure](#project-structure)
  - [Entrypoint](#entrypoint)
  - [Routing](#routing)
- [System Requirements](#system-requirements)

<!-- tocstop -->

## Usage

First install dependencies using `npm i`.

Then simply start the server using `npm start` or `npm run dev` if you are
working on the project locally. This will start a hot-reload process listening
on port `3005` by default.

## Environment Variables

There are a few environment variables that you MUST set:

- `NODE_CONFIG_ENV`: whether the service should be ran in `development` or `production` mode. Basically, this loads a separate set of default configuration.
- `AO_UNIT`: which `ao` Unit, either `cu` or `mu`, this Reverse Proxy Service is meant to mirror.
- `HOSTS`: a comma-delimited string containing all of the underlying hosts that can Reverse Proxied to. If `AO_UNIT` is `cu`, then `HOSTS` should be a series of `ao` Compute Unit Hosts. Similarly if `AO_UNIT` is `mu` then `HOSTS` should be a series of `ao` Messenger Unit Hosts

> In order for the Router's Reverse Proxying to be consistent, the ordering of the `HOST` list MUST be consistent.

## Tests

You can execute unit tests by running `npm test`

## Debug Logging

You can enable verbose debug logging on the Web Server, by setting the `DEBUG`
environment variable to the scope of logs you're interested in

All logging is scoped under the name `ao-router*`.

## Project Structure

This `ao` Unit Router project is simple service, with minimal business logic.

The total service boilerplate is less than ~200 lines while the business logic is less than ~10 lines.

The ONLY custom code that's specific to the `ao` Units exists in the [entrypoint](./src/app.js), where the specific endpoints to Reverse Proxy are specified.

### Entrypoint

The entrypoint is `src/app.js` where the ONLY custom configuration is specified. Here, we mirror the `ao` Unit API for both the CU and MU, and set up the Reverse Proxying handlers.

### Routing

All routing logic can be found in `src/router.js`

## System Requirements

The `ao` Unit Router Server is containerized stateless application, and can be deployed to any containerized environment using its `Dockerfile`. It will also need some way to receive secrets injected from it's environment ie. some sort of Parameter Store. See [Environment Variables](#environment-variables).

It will need to accept ingress from the Internet over `HTTPS` in order to fulfill incoming requests, and egress to other `ao` Units over `HTTP` or `HTTPS`.

So in summary, this `ao` Unit Server system requirements are:

- a Containerization Environment to run the application
- Memory scaling
- an ability for secrets to be Injected into the Environment
- an ability to accept Ingress from the Internet
- an ability to Egress to other `ao` Units
