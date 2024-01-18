#!/usr/bin/env bash

WALLET=$(aws secretsmanager get-secret-value --secret-id ao-wallet --query SecretString --output text)

# make a .env file
echo "WALLET=$WALLET" >> .env

# start the server
node src/app.js