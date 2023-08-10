# SmartWeave

[![Gitopia](https://img.shields.io/endpoint?style=&url=https://gitopia.org/mirror-badge.json)](https://gitopia.org/#/BPr7vrFduuQqqVMu_tftxsScTKUq9ke0rx4q5C9ieQU/smartweave)

## Simple, scalable smart contracts on the Arweave protocol

Uses lazy-evaluation to move the burden of contract execution from network nodes
to smart contract users. Currently, SmartWeave supports JavaScript, using the
client's unmodified execution engine.

**Version: 0.4**

For information on how the contracts execute, how to write one, and the API, read the [Contract Guide](CONTRACT-GUIDE.md) and check some of the [examples](examples/)

For information on how to create a new Profit Sharing Token (PST), you can read the [PST Creation Guide](CREATE-PST.md).

For a description of the SDK methods available, you can check [here](SDK.md)

## CLI Usage

`npm install -g smartweave`

You can deploy a contract as follows:

```
smartweave create [SRC LOCATION] [INITIAL STATE FILE] --key-file [YOUR KEYFILE]
```

Or, using an existing contract source that is already deployed but with a new initial state and contract id:

```
smartweave [SRC TX] [INITIAL STATE FILE] --key-file [YOUR KEYFILE]
```

Check its state:

```
smartweave read [CONTRACT TXID]
```

Interact with it:

```
smartweave write [CONTRACT TXID] --key-file [YOUR KEYFILE] \
  --input "[CONTRACT INPUT STRING HERE]"
```

When interacting with the contract, the value passed to --input must be valid json. Typically an object is used:

`--input '{ "function": "transfer", "qty": 1984 }'`

To test a contract interaction without writing it to the network, append `--dry-run` to your `--interact` call.

## License

This project is licensed under the terms of the MIT license.
