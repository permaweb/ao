# Message Passing

## Usage

Install packages:

`npm i`

Deploy contracts and start app:

`npm run ./scripts/launch.mjs`

This will print out the `id`'s for the `sender` and `receiver` contracts and start the `web app`.

Run an interaction that will send a message from `sender` to `receiver`:

`SENDER=<sender-id> node ./scripts/run.mjs`

You should now be able to look at the `web app` in the browser and see that the state of each contract has been updated.

The messages have been sent and received.

## Stuff

Directories

- `sender/`: Lua `ao` contract that sends messages and updates state.
- `receiver/`: Lua `ao` contract that receives messages and updates state.
- `scripts/`: The node scripts for using the contracts
- `app/`: A react app that takes the ID's and fetches their state.

TODO: Once the cors issue is fixed in the servers, we should be able to send a message from the UI.