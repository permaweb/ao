# Message Passing

## Usage

Install packages:

`npm i`

Deploy contracts and start app:

`npm run launch`

This will print out the `id`'s for the `sender` and `receiver` contracts and start the `web app`.

Run an interaction that will send a message from `sender` to `receiver`:

`SENDER=<sender-id> npm run run`

You should now be able to look at the `web app` in the browser and see that the state of each contract has been updated.

The messages have been sent and received.

## Stuff

Directories

- `sender/`: Lua `ao` contract that sends messages and updates state.
- `receiver/`: Lua `ao` contract that receives messages and updates state.
- `scripts/`: The node scripts for using the contracts
- `app/`: A react app that takes the ID's and fetches their state.

## Bonus

If you click the little `send message` text, that will send another TX.  The styling is terrible though so it won't look like it's working until you refresh the page.