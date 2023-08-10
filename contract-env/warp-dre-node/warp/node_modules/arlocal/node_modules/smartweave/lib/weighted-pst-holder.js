"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.selectWeightedPstHolder = void 0;
/**
 * Given an map of address->balance, select one random address
 * weighted by the amount of tokens they hold.
 *
 * @param balances  A balances object, where the key is address and the value is the number of tokens they hold
 */
function selectWeightedPstHolder(balances) {
    // Count the total tokens
    let totalTokens = 0;
    for (const address of Object.keys(balances)) {
        totalTokens += balances[address];
    }
    // Create a copy of balances where the amount each holder owns is represented
    // by a value 0-1.
    const weighted = {};
    for (const address of Object.keys(balances)) {
        weighted[address] = balances[address] / totalTokens;
    }
    let sum = 0;
    const r = Math.random();
    for (const address of Object.keys(weighted)) {
        sum += weighted[address];
        if (r <= sum && weighted[address] > 0) {
            return address;
        }
    }
    throw new Error('Unable to select token holder');
}
exports.selectWeightedPstHolder = selectWeightedPstHolder;
