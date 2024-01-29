#!/usr/bin/env bash

# make a wallet.json file from secrets-manager
aws secretsmanager get-secret-value --secret-id ao-wallet --query SecretString --output text > wallet.json

# make a .env file
echo "PATH_TO_WALLET=wallet.json" >> .env

# start the server
node -r dotenv/config src/app.js