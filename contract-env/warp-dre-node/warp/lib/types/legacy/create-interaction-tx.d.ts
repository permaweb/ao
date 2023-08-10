import Arweave from 'arweave';
import { GQLNodeInterface } from './gqlResult';
import { SigningFunction } from '../contract/Signature';
import { BlockData, Transaction } from '../utils/types/arweave-types';
import { Tags } from '../contract/deploy/CreateContract';
export declare function createInteractionTx<Input>(arweave: Arweave, signer: SigningFunction, contractId: string, input: Input, tags: Tags, target: string, winstonQty: string, dummy: boolean, isTestnet: boolean, reward?: string): Promise<Transaction>;
export declare function createDummyTx(tx: Transaction, from: string, block: BlockData): GQLNodeInterface;
export declare function createInteractionTagsList<Input>(contractId: string, input: Input, isTestnet: boolean, customTags?: Tags): Tags;
//# sourceMappingURL=create-interaction-tx.d.ts.map