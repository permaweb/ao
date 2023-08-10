#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs"));
const init_figlet_1 = __importDefault(require("./init-figlet"));
const handlers_1 = require("./handlers");
// this contains all the messages printed by the CLI
const cli_command_messages_json_1 = __importDefault(require("../static/cli-command-messages.json"));
// smartweave read [--input.function="hello"]   -- contractId
// smartweave write --input.function --dry-run  -- contractId
// smartweave create <sourceTx | sourceFile> <initStateFile>
// smartweave info -- contractId
init_figlet_1.default(cli_command_messages_json_1.default.common.figletText);
const readCommand = {
    command: 'read <contractId>',
    describe: cli_command_messages_json_1.default.commands.readCommand.description,
    builder: () => yargs_1.default
        .options({
        input: {
            describe: cli_command_messages_json_1.default.commands.readCommand.options.input.description,
            demandOption: false,
        },
        prettify: {
            describe: cli_command_messages_json_1.default.commands.readCommand.options.prettify.description,
        },
    })
        .positional('contractId', {
        describe: cli_command_messages_json_1.default.commands.readCommand.positionals.contractId.description,
    }),
    handler: handlers_1.readCommandHandler,
};
const writeCommand = {
    command: 'write <contractId>',
    describe: 'Writes an interaction with contract, or simulates a write interaction.',
    builder: () => yargs_1.default
        .options({
        'key-file': {
            describe: 'Your key file',
            demandOption: true,
        },
        input: {
            describe: 'Input to the contract',
            demandOption: true,
        },
        'dry-run': {
            describe: 'Simulate interaction and output contract state',
            boolean: true,
        },
        prettify: {
            describe: 'If set prints the eventual output state as a stringified and prettified JSON',
        },
        tags: {
            describe: 'The tags to be sent along with the Contract interaction. They should be a string containing an array of Objects {name:tagName, value:tagValue} (i.e. \'[{"name":"arweave", "value":"rocks"},{"name":"smartweave", "value":"rocks too"}]\')',
        },
        quantity: {
            describe: 'The amount of winston to be sent along with the Contract interaction',
        },
        target: {
            describe: 'The wallet to which send the winston send along with the Contract interaction',
        },
    })
        .positional('contractId', {
        describe: 'The Contract ID',
    }),
    handler: handlers_1.writeCommandHandler,
};
const createCommand = {
    command: 'create <contractSource> <initStateFile>',
    describe: 'Creates a new contract from a source file or existing contract source already on-chain.',
    builder: () => yargs_1.default
        .options({
        'key-file': {
            describe: 'Your key file',
            demandOption: true,
        },
    })
        .positional('contractSource', { describe: 'The contract source. A path to a .js file, or transaction id' })
        .positional('initStateFile', { describe: 'The initial state of the contract. Path to a .json file' }),
    handler: handlers_1.createCommandHandler,
};
// tslint:disable-next-line: no-unused-expression
yargs_1.default.command(readCommand).command(writeCommand).command(createCommand).demandCommand().help().argv;
