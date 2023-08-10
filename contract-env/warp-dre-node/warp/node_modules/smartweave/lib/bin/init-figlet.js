"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const figlet_1 = __importDefault(require("figlet"));
const chalk_1 = __importDefault(require("chalk"));
const initFiglet = (text) => {
    const bannerSmartWeave = figlet_1.default.textSync(text, {
        horizontalLayout: 'universal smushing',
    });
    console.log(chalk_1.default.white(bannerSmartWeave));
    return;
};
exports.default = initFiglet;
