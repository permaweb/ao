/**
 * Given an map of address->balance, select one random address
 * weighted by the amount of tokens they hold.
 *
 * @param balances  A balances object, where the key is address and the value is the number of tokens they hold
 */
export declare function selectWeightedPstHolder(balances: Record<string, number>): string;
