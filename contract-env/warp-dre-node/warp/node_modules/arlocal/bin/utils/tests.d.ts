import Blockweave from 'blockweave';
export declare function createTransaction(blockWeave: Blockweave, data?: any): Promise<string>;
export declare function mine(blockweave: Blockweave): Promise<void>;
