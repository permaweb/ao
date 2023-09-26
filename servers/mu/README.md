# AO Messenger Unit

Short description

## Purpose

## Usage

In order for the Messenger Unit to work properly, it needs to have a JWK passed to it at run time.

```zsh
docker run -e WALLET=$WALLET_STRING -p 3004:3004 mu-app
```

The `$WALLET_STRING` will be passed into the container and can be accessed by the node program via `process.env.WALLET`

See: [Config](./src/config.js)

The point of this is that you don't want to `build` your image with a key file in it because...  Let the operators pass their key to the container environment.

## Resources