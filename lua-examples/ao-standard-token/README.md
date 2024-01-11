# `ao` Standard Token

This Process implements the [`ao` Standard Token Specification](https://hackmd.io/8DiMkhuNThOb_ooTWKqxaw), implementing a token called `Points Coin`!

| Parameter      | Value | 
| -------- | ----------- | 
| Name     | `Points Coin`  | 
| Ticker   | `PNTS` | 
| Logo     | `SBCCXwwecBlDqRLUjb8dYABExTJXLieawf7m2aBJ-KY` 😎 | 
| Denomination | `10` |

The Process is implemented using [`aos`](https://github.com/twilson63/ao-repl/tree/main), that then loads the `ao` Standard Token Specification Implementation from [`token.lua`](./token.lua)

<!-- toc -->

- [Getting Started](#getting-started)
- [Actions](#actions)
  - [Check Info](#check-info)
  - [Check Balances](#check-balances)
  - [Check Balance](#check-balance)
  - [Transfer](#transfer)
  - [Mint](#mint)
- [Create your own `ao` Standard Token](#create-your-own-ao-standard-token)

<!-- tocstop -->

## Getting Started

To interact with , you can use [`aos`](https://github.com/twilson63/ao-repl/tree/main)

```sh
npm i -g https://get_ao.g8way.io && aos
```

Then load the `token.lua` file into your `aos` Process, which implements the [`ao` Standard Token Specification](https://hackmd.io/8DiMkhuNThOb_ooTWKqxaw)

```sh
.load token.lua
```

Now your `aos` Process is a freshly minted `Points Coin` Asset!

## Actions

> Any of these `Actions` can be sent from the `aos` Process, itself, of from another Process, even another `aos` Process!

### Check Info

You can retrieve information like the `Name`, `Ticker`, `Logo`, adn `Denomination` by sending the Process an `Info` message:

```lua
send({ Target = ao.id, Tags = { Action = "Info" }})
aos> inbox[#inbox]
```

### Check Balances

```lua
aos> send({ Target = ao.id, Tags = { Action = "Balances" }})
aos> inbox[#inbox].Data
```

### Check Balance

You can check your balance:

```lua
aos> send({ Target = ao.id, Tags = { Action = "Balance" }})
aos> inbox[#inbox].Data
```

Or the balance of another wallet or Process, by specifiying `Tags.Target`:

```lua
aos> send({ Target = ao.id, Tags = { Action = "Balance", Target = '...' }})
aos> inbox[#inbox].Data
```

### Transfer

Transfer a portion or all of your units to another wallet or Process:

```lua
aos> send({ Target = ao.id, Tags = { Action = "Transfer", Recipient = '...', Quantity = '10000' }})
```

If the `Transfer` was successful, both balances will be adjusted accordingly. In addition, you will receive a `Debit-Notice` message and the `Recipient` will receive a `Credit-Notice` message.

> To disable the notification messages on a `Transfer`, you can add a `Cast` tag to your message, set to any value.

If there is an insufficient balance, then you will receive a `Transfer-Error` Message:

```lua
{   
    ...,
    Tags = {
        Action: 'Transfer-Error,
        ['Message-Id']: '<...>',
        Error: 'Insufficient Balance!'
    }
}
```

### Mint

The Process itself can `mint` more `Points Coin`!

```lua
aos> send({ Target = ao.id, Tags = { Action = "Mint", Quantity = '10000' }})
```

This will add the `Quantity` to the Processes' balance!

> Minting logic will be specific to your use-case, this is just a simple example.

## Create your own `ao` Standard Token

You can use this `token.lua` as the starting implementation of your own [`ao` Standard Token](https://hackmd.io/8DiMkhuNThOb_ooTWKqxaw). Just set your `Name`, `Ticker`, `Logo`, and `Denomination`
