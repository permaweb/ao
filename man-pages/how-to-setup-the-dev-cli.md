# how to setup the dev cli

Docker is required at the moment -- [Install Docker](https://www.docker.com/get-started/).

<!-- toc -->

- [Install the CLI](#install-the-cli)
- [Check the Version](#check-the-version)

<!-- tocstop -->

## Install the CLI

Replace `{tx}` with the `txMappings.install.latest` in this `json` file https://github.com/permaweb/ao/blob/main/dev-cli/deno.json.

```zsh
curl -L https://arweave.net/{tx} | bash
```

## Check the Version

The version the day of writing this is `0.0.24`.

```zsh
ao --version
```