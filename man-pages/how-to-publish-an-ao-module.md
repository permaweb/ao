# how to publish an ao module

It is assumed that you've: 

- [Setup the dev cli](./how-to-setup-the-dev-cli.md) 
- [Created an AO module](./how-to-create-an-ao-module.md)
- [Built the AO module](./how-to-build-an-ao-module.md)

<!-- toc -->

- [Publish the WASM](#publish-the-wasm)

<!-- tocstop -->

## Publish the WASM

Assuming your using the process created from `how to create an AO module`, you should be in the directory of your process created from `ao init my-process` which is `my-process`


```zsh
ao publish process.wasm
```

This command will return a `tx` that represents the transaction ID of the process.