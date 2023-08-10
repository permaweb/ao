"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCommandHandler = exports.writeCommandHandler = exports.readCommandHandler = void 0;
const fs_1 = require("fs");
const arweave_1 = __importDefault(require("arweave"));
const loglevel_1 = __importDefault(require("loglevel"));
const clui_1 = __importDefault(require("clui"));
const chalk_1 = __importDefault(require("chalk"));
const json_beautify_1 = __importDefault(require("json-beautify"));
const sentencer_1 = __importDefault(require("sentencer"));
const Sdk = __importStar(require(".."));
const utils_1 = require("../utils");
const utils_2 = require("./utils");
const inquirer_1 = require("./inquirer");
const arweave = arweave_1.default.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
    logging: false,
    timeout: 15000,
});
function readCommandHandler(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        // creates a spinner for the read command
        const { Spinner } = clui_1.default;
        const status = new Spinner(`Loading the state of the contract ${argv.contractId}, please wait...`);
        status.start();
        const contractId = argv.contractId;
        let input = argv.input;
        const jsonInput = utils_2.getJsonInput(input);
        input = jsonInput || input;
        try {
            let result;
            if (input) {
                result = yield Sdk.interactRead(arweave, undefined, contractId, input);
            }
            else {
                result = yield Sdk.readContract(arweave, contractId);
            }
            status.stop();
            console.log(`
    🤓 ${chalk_1.default.green(`We found what you are looking for`)} 🤓

    The following is the current state of the contract ${chalk_1.default.bgBlack(chalk_1.default.white(contractId))}: 
    `);
            argv.prettify
                ? console.log(json_beautify_1.default(result, null, 2, 100))
                : console.log(result, `
    For a complete and prettier version of this state run:

      ${chalk_1.default.bgBlack(chalk_1.default.white(`smartweave read ${contractId} --prettify`))}
      `);
        }
        catch (e) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('It seems that a contract having the TXID:')} ${chalk_1.default.bgBlack(chalk_1.default.white(e.otherInfo.requestedTxId))} ${chalk_1.default.red('is not stored on the arweave')} 🤔

      Are you sure that the contract you are trying to access was actually deployed and that the related transaction was confirmed?

      ${chalk_1.default.red('If you feel so, please report this incident to our team at https://www.arweave.org!')}
    `);
        }
    });
}
exports.readCommandHandler = readCommandHandler;
function writeCommandHandler(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        // creates a spinner for the read command
        const { Spinner } = clui_1.default;
        let status = new Spinner(``);
        const contractId = argv.contractId;
        const dryRun = argv.dryRun;
        const quant = argv.quantity;
        const target = argv.target;
        let tags = argv.tags;
        let input = argv.input;
        let wallet;
        status = new Spinner(`Checking your key-file, please wait...`);
        status.start();
        try {
            wallet = JSON.parse(fs_1.readFileSync(argv.keyFile).toString());
            status.stop();
        }
        catch (err) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('It seems that the key-file')} ${chalk_1.default.bgBlack(chalk_1.default.white(argv.keyFile))} ${chalk_1.default.red('is not in your file system')} 🤔

      Please double check the path of your key-file and try again! 
    `);
            process.exit(0);
        }
        if (!target && quant) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('You are trying to send an amount of')} ${chalk_1.default.bgBlack(chalk_1.default.white(quant))} ${chalk_1.default.red('winston but you did not specified a target receiver!')} 🤔

      This interaction cannot be accepted! Please double check what you are trying to do and retry! 
    `);
            process.exit(0);
        }
        else if (target && !quant) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('You have specified the target receiver')} ${chalk_1.default.bgBlack(chalk_1.default.white(target))} ${chalk_1.default.red('but you did not specified any amount of winston to send to it!')} 🤔

      This interaction cannot be accepted! Please double check what you are trying to do and retry! 
    `);
            process.exit(0);
        }
        if (tags) {
            status = new Spinner(`Checking the tags you sent, please wait...`);
            status.start();
            try {
                const parsedTags = JSON.parse(tags);
                tags = Object.values(parsedTags);
                status.stop();
            }
            catch (e) {
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that the tags')} ${chalk_1.default.bgBlack(chalk_1.default.white(tags))} ${chalk_1.default.red('are not formatted as a valid JSON array.')} 🤔
  
        Please double check the path of your key-file and try again! 
      `);
                status.stop();
                process.exit(0);
            }
        }
        if (input) {
            status = new Spinner(`Checking the inputs you sent, please wait...`);
            status.start();
            try {
                const jsonInput = utils_2.getJsonInput(input);
                input = jsonInput || input;
                status.stop();
            }
            catch (err) {
                status.stop();
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that the input')} ${chalk_1.default.bgBlack(chalk_1.default.white(input))} ${chalk_1.default.red('is not a valid JSON input')} 🤔
  
        Please double check the path of your key-file and try again! 
      `);
                process.exit(0);
            }
        }
        try {
            let result;
            if (dryRun) {
                status = new Spinner(`Trying to simulate a write to the contract, please wait...`);
                status.start();
                const { reward, quantity } = yield Sdk.simulateInteractWrite(arweave, wallet, contractId, input, tags, target, quant);
                const totalAmount = arweave.ar.winstonToAr((parseFloat(reward) + parseFloat(quantity)).toString());
                result = yield Sdk.interactWriteDryRun(arweave, wallet, contractId, input, tags, target, quant);
                status.stop();
                console.log(`
      🤓 ${chalk_1.default.green(`I simulated the contract write you are trying to perform!`)} 🤓
  
      For this interaction you will spend a total amount of ${chalk_1.default.bgBlack(chalk_1.default.white(totalAmount))} AR (including the eventual quantity you have specified and the network fee).
      
      The following would be the state of the contract ${chalk_1.default.bgBlack(chalk_1.default.white(contractId))} after this interaction: 
      `);
                argv.prettify
                    ? console.log(json_beautify_1.default(result, null, 2, 100))
                    : console.log(result, `
      For a complete and prettier version of this state run:
  
      ${chalk_1.default.bgBlack(chalk_1.default.white(`smartweave write ${contractId} --key-file ${argv.keyFile} --input '${argv.input}' --dry-run --prettify`))}
      `);
                process.exit(0);
            }
            else {
                status = new Spinner(`Trying to write the contract, please wait...`);
                status.start();
                // firstly simulate the contract call compute the rewards and ask for the user confirmation
                const { reward, quantity } = yield Sdk.simulateInteractWrite(arweave, wallet, contractId, input, tags, target, quant);
                const totalAmount = arweave.ar.winstonToAr((parseFloat(reward) + parseFloat(quantity)).toString());
                const userAddress = yield arweave.wallets.jwkToAddress(wallet);
                const userBalance = arweave.ar.winstonToAr(yield arweave.wallets.getBalance(userAddress));
                const expectedContractInteractionFee = totalAmount;
                const userBalanceAfterCreation = parseFloat(userBalance) - parseFloat(expectedContractInteractionFee);
                const confirmRandomWord = sentencer_1.default.make('{{ adjective }}');
                if (userBalanceAfterCreation < 0) {
                    status.stop();
                    loglevel_1.default.error(`
        😭 ${chalk_1.default.red('It seems that you do not have enough AR to interact with this contract')} 😭
    
        - To interact with this contract you need to pay a fee of ~${chalk_1.default.bgBlack(chalk_1.default.white(expectedContractInteractionFee))} AR (including the network fees and the quantity you have eventually specified);
        - Your current wallet balance is ~${chalk_1.default.bgBlack(chalk_1.default.white(userBalance))} AR;
  
        ${chalk_1.default.red('So sorry for this ...')}
        `);
                    process.exit(0);
                }
                status.stop();
                console.log(`
        🤓 ${chalk_1.default.green(`Everything is ready for interacting with the contract! Please review the following info:`)} 🤓
  
        - To interact with this contract you need to pay a fee of ~${chalk_1.default.bgBlack(chalk_1.default.white(expectedContractInteractionFee))} AR (including the network fees and the quantity you have eventually specified);
        - Your current wallet balance is ${chalk_1.default.bgBlack(chalk_1.default.white(userBalance))} AR;
        - After the interaction your wallet balance will be ~${chalk_1.default.bgBlack(chalk_1.default.white(userBalanceAfterCreation))} AR.     
      `);
                const resp = yield inquirer_1.askForContractInteractionConfirmation(confirmRandomWord, expectedContractInteractionFee);
                if (resp.payFeeForContractInteraction.toUpperCase() !== confirmRandomWord.toUpperCase()) {
                    loglevel_1.default.error(`
        🤷🏽‍♀️ ${chalk_1.default.red('Ok! No problem I will not send this contract interaction')} 🤷🏽‍♀️
    
        See you next time! 👋
        `);
                    process.exit(0);
                }
                console.log('\n');
                status = new Spinner(`Amazing! Let me post this interaction, please wait...`);
                status.start();
                result = yield Sdk.interactWrite(arweave, wallet, contractId, input, tags, target, quant);
                status.stop();
                console.log(`     🥳 ${chalk_1.default.green(`The interaction with the contract ${contractId} was successfully posted at TXID ${chalk_1.default.bgBlack(chalk_1.default.white(result))}!`)} 🥳

      To check the confirmation status of this interaction run:
      
      ${chalk_1.default.bgBlack(chalk_1.default.white(`arweave status ${result}`))}
      `);
                process.exit(0);
            }
        }
        catch (e) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('It seems that a contract having the TXID:')} ${chalk_1.default.bgBlack(chalk_1.default.white(contractId))} ${chalk_1.default.red('is not stored on the arweave')} 🤔

      Are you sure that the contract you are trying to access was actually deployed and that the related transaction was confirmed?

      ${chalk_1.default.red('If you feel so, please report this incident to our team at https://www.arweave.org!')}
    `);
            process.exit(0);
        }
    });
}
exports.writeCommandHandler = writeCommandHandler;
function createCommandHandler(argv) {
    return __awaiter(this, void 0, void 0, function* () {
        const contractSource = argv.contractSource;
        const initStateFile = argv.initStateFile;
        const { Spinner } = clui_1.default;
        let status = new Spinner(``);
        let wallet = null;
        // checks if the user sent a valid key-file
        try {
            status = new Spinner(`Checking your key-file, please wait...`);
            status.start();
            wallet = JSON.parse(fs_1.readFileSync(argv.keyFile).toString());
            status.stop();
        }
        catch (err) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('It seems that the key-file')} ${chalk_1.default.bgBlack(chalk_1.default.white(argv.keyFile))} ${chalk_1.default.red('is not in your file system')} 🤔

      Please double check the path of your key-file and try again! 
    `);
            process.exit(0);
        }
        // checks if the user sent a json as the initial status of the contract
        status = new Spinner(`Checking the initial JSON state you passed in, please wait...`);
        status.start();
        if (!utils_2.isExpectedType(initStateFile, 'json')) {
            status.stop();
            loglevel_1.default.error(`
    🤔 ${chalk_1.default.red('It seems that')} ${chalk_1.default.bgBlack(chalk_1.default.white(initStateFile))} ${chalk_1.default.red('is not a JSON')} 🤔

      To create a contract you must pass in a valid JSON file as the initial state of your contract! 
    `);
            process.exit(0);
        }
        status.stop();
        // we'll assume all sources that include `.` are a local path since `.` is not a valid char in a trasaction id
        if (contractSource.includes('.')) {
            // assert(existsSync(contractSource), `The file name provided was not found in your file system: ${contractSource}`);
            // checks if the user has sent a contract source that exists in the filesystem
            status = new Spinner(`Checking your contract source, please wait...`);
            status.start();
            if (!fs_1.existsSync(contractSource)) {
                status.stop();
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that')} ${chalk_1.default.bgBlack(chalk_1.default.white(contractSource))} ${chalk_1.default.red('is not in your filesystem')} 🤔
  
        Please double check the path of your contract source and try again! 
      `);
                process.exit(0);
            }
            // assert(isExpectedType(contractSource, 'js'), 'The contract source must be a javascript file.');
            // checks if the user sent a js file as the contract source
            if (!utils_2.isExpectedType(contractSource, 'js')) {
                status.stop();
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that')} ${chalk_1.default.bgBlack(chalk_1.default.white(contractSource))} ${chalk_1.default.red('is not a javascript file')} 🤔
  
        To create a contract you must pass in a valid javascript file as the contract source of your contract! 
      `);
                process.exit(0);
            }
            status.stop();
            // simulates the create contract transaction and waits for the user confirmation
            status = new Spinner(`Computing the fee needed for creating your contract, please wait...`);
            status.start();
            const tx = yield Sdk.simulateCreateContractFromSource(arweave, wallet, fs_1.readFileSync(initStateFile).toString(), fs_1.readFileSync(contractSource).toString());
            const userAddress = yield arweave.wallets.jwkToAddress(wallet);
            const userBalance = arweave.ar.winstonToAr(yield arweave.wallets.getBalance(userAddress));
            const expectedContractCreationFee = yield arweave.ar.winstonToAr(tx.reward);
            const userBalanceAfterCreation = parseFloat(userBalance) - parseFloat(expectedContractCreationFee);
            const confirmRandomWord = sentencer_1.default.make('{{ adjective }}');
            status.stop();
            if (userBalanceAfterCreation < 0) {
                loglevel_1.default.error(`
      😭 ${chalk_1.default.red('It seems that you do not have enough AR to create this contract')} 😭
  
      - To create this contract you need to pay a fee of ~${chalk_1.default.bgBlack(chalk_1.default.white(expectedContractCreationFee))} AR;
      - Your current wallet balance is ~${chalk_1.default.bgBlack(chalk_1.default.white(userBalance))} AR;

      ${chalk_1.default.red('So sorry for this ...')}
      `);
                process.exit(0);
            }
            console.log(`
      🤓 ${chalk_1.default.green(`Everything is ready for creating your contract! Please review the following info:`)} 🤓

      - To create this contract you need to pay a fee of ~${chalk_1.default.bgBlack(chalk_1.default.white(expectedContractCreationFee))} AR;
      - Your current wallet balance is ${chalk_1.default.bgBlack(chalk_1.default.white(userBalance))} AR;
      - After the creation your wallet balance will be ~${chalk_1.default.bgBlack(chalk_1.default.white(userBalanceAfterCreation))} AR.     
    `);
            const resp = yield inquirer_1.askForContractCreationConfirmation(confirmRandomWord, expectedContractCreationFee);
            if (resp.payFeeForContractCreation.toUpperCase() !== confirmRandomWord.toUpperCase()) {
                loglevel_1.default.error(`
      🤷🏽‍♀️ ${chalk_1.default.red('Ok! No problem I will not deploy your contract')} 🤷🏽‍♀️
  
      See you next time! 👋
      `);
                process.exit(0);
            }
            console.log('\n');
            status = new Spinner(`Amazing! Let me deploy your contract, please wait...`);
            status.start();
            try {
                const contractId = yield Sdk.createContract(arweave, wallet, fs_1.readFileSync(contractSource).toString(), fs_1.readFileSync(initStateFile).toString());
                // console.log(`Contract ID: ${contractId}`);
                status.stop();
                console.log(`     🥳 ${chalk_1.default.green(`Your contract with ID ${chalk_1.default.bgBlack(chalk_1.default.white(contractId))} was successfully deployed on the arweave!`)} 🥳

      To check its confirmation status run ${chalk_1.default.bgBlack(chalk_1.default.white(`arweave status ${contractId}`))}
      `);
                process.exit(0);
            }
            catch (e) {
                status.stop();
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that something unpredictable happened here ... I was not able to deploy your contract!')} 🤔
  
      Are you sure that you made everything correctly by your side?

      ${chalk_1.default.red('If you feel so, please report this incident to our team at https://www.arweave.org!')}
      `);
                process.exit(0);
            }
        }
        else {
            let sourceTx;
            try {
                status = new Spinner(`Checking your contract source, please wait...`);
                status.start();
                sourceTx = yield arweave.transactions.get(contractSource);
                const appTag = utils_1.getTag(sourceTx, 'App-Name');
                // assert(
                //  appTag && appTag === 'SmartWeaveContractSource',
                //  'The source transaction must be a valid smartweave contract source.',
                // );
                // checks that the given transaction is actually a SmartWeave Contract source
                // this is a valid contract iTD2q-tNQ2Mavm1IBfxlFM_AUi6acr_npNivY4JUS80
                // this is a transaction not related to a contract 5fZuZTE6wA9xb2Iw8F9-kIo7IV4MQ55LBEyOaIapXtc
                // this is not a valid transaction iTD2q-tNQ2Mavm1IBfxlFM_AUi6acr_npNivY4JUS8
                if (!appTag || appTag !== 'SmartWeaveContractSource') {
                    status.stop();
                    loglevel_1.default.error(`
        🤔 ${chalk_1.default.red('It seems that the TXID')} ${chalk_1.default.bgBlack(chalk_1.default.white(contractSource))} ${chalk_1.default.red('is not a transaction related to a SmartWeave source contract')} 🤔
    
          To create a contract you must pass in a TXID that refers to a SmartWeave contract source! 
        `);
                    process.exit(0);
                }
            }
            catch (e) {
                status.stop();
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that a contract having the TXID:')} ${chalk_1.default.bgBlack(chalk_1.default.white(contractSource))} ${chalk_1.default.red('is not stored on the arweave')} 🤔
  
        Are you sure that the contract you are trying to access was actually deployed and that the related transaction was confirmed?
  
        ${chalk_1.default.red('If you feel so, please report this incident to our team at https://www.arweave.org!')}
      `);
                process.exit(0);
            }
            try {
                // simulates the create contract transaction and waits for the user confirmation
                status.stop();
                status = new Spinner(`Computing the fee needed for creating your contract, please wait...`);
                status.start();
                const tx = yield Sdk.simulateCreateContractFromTx(arweave, wallet, sourceTx.id, fs_1.readFileSync(initStateFile).toString());
                status.stop();
                const userAddress = yield arweave.wallets.jwkToAddress(wallet);
                const userBalance = arweave.ar.winstonToAr(yield arweave.wallets.getBalance(userAddress));
                const expectedContractCreationFee = yield arweave.ar.winstonToAr(tx.reward);
                const userBalanceAfterCreation = parseFloat(userBalance) - parseFloat(expectedContractCreationFee);
                const confirmRandomWord = sentencer_1.default.make('{{ adjective }}');
                if (userBalanceAfterCreation < 0) {
                    loglevel_1.default.error(`
        😭 ${chalk_1.default.red('It seems that you do not have enough AR to create this contract')} 😭
    
        - To create this contract you need to pay a fee of ~${chalk_1.default.bgBlack(chalk_1.default.white(expectedContractCreationFee))} AR;
        - Your current wallet balance is ~${chalk_1.default.bgBlack(chalk_1.default.white(userBalance))} AR;
  
        ${chalk_1.default.red('So sorry for this ...')}
        `);
                    process.exit(0);
                }
                console.log(`
        🤓 ${chalk_1.default.green(`Everything is ready for creating your contract! Please review the following info:`)} 🤓
  
        - To create this contract you need to pay a fee of ~${chalk_1.default.bgBlack(chalk_1.default.white(expectedContractCreationFee))} AR;
        - Your current wallet balance is ${chalk_1.default.bgBlack(chalk_1.default.white(userBalance))} AR;
        - After the creation your wallet balance will be ~${chalk_1.default.bgBlack(chalk_1.default.white(userBalanceAfterCreation))} AR.     
      `);
                const resp = yield inquirer_1.askForContractCreationConfirmation(confirmRandomWord, expectedContractCreationFee);
                if (resp.payFeeForContractCreation.toUpperCase() !== confirmRandomWord.toUpperCase()) {
                    loglevel_1.default.error(`
        🤷🏽‍♀️ ${chalk_1.default.red('Ok! No problem I will not deploy your contract')} 🤷🏽‍♀️
    
        See you next time! 👋
        `);
                    process.exit(0);
                }
                console.log('\n');
                status = new Spinner(`Amazing! Let me deploy your contract, please wait...`);
                status.start();
                const contractId = yield Sdk.createContractFromTx(arweave, wallet, sourceTx.id, fs_1.readFileSync(initStateFile).toString());
                status.stop();
                console.log(`     🥳 ${chalk_1.default.green(`Your contract with ID ${chalk_1.default.bgBlack(chalk_1.default.white(contractId))} was successfully deployed on the arweave!`)} 🥳

      To check its confirmation status run ${chalk_1.default.bgBlack(chalk_1.default.white(`arweave status ${contractId}`))}
      `);
                process.exit(0);
            }
            catch (e) {
                status.stop();
                loglevel_1.default.error(`
      🤔 ${chalk_1.default.red('It seems that something unpredictable happened here ... I was not able to deploy your contract!')} 🤔
  
      Are you sure that you made everything correctly by your side?

      ${chalk_1.default.red('If you feel so, please report this incident to our team at https://www.arweave.org!')}
      `);
                process.exit(0);
            }
        }
    });
}
exports.createCommandHandler = createCommandHandler;
