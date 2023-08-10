"use strict";
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
exports.askForContractInteractionConfirmation = exports.askForContractCreationConfirmation = void 0;
const inquirer_1 = __importDefault(require("inquirer"));
const askForContractCreationConfirmation = (randWord, expectedContractCreationFee) => __awaiter(void 0, void 0, void 0, function* () {
    const questions = [
        {
            name: 'payFeeForContractCreation',
            type: 'input',
            message: `💸 Do you want to pay a fee of ${expectedContractCreationFee} AR to publish your contract? 💸 If so, write this random adjective: ${randWord.toUpperCase()} and press ENTER (otherwise type anything else):`,
        },
    ];
    return inquirer_1.default.prompt(questions);
});
exports.askForContractCreationConfirmation = askForContractCreationConfirmation;
const askForContractInteractionConfirmation = (randWord, expectedContractInteractionFee) => __awaiter(void 0, void 0, void 0, function* () {
    const questions = [
        {
            name: 'payFeeForContractInteraction',
            type: 'input',
            message: `💸 Do you want to pay a fee of ${expectedContractInteractionFee} AR to interact with this contract? 💸 If so, write this random adjective: ${randWord.toUpperCase()} and press ENTER (otherwise type anything else):`,
        },
    ];
    return inquirer_1.default.prompt(questions);
});
exports.askForContractInteractionConfirmation = askForContractInteractionConfirmation;
