import { GQLNodeInterface, GQLTagInterface } from '../../../legacy/gqlResult';
import { Transaction } from '../../../utils/types/arweave-types';
/**
 * A class that is responsible for retrieving "input" tag from the interaction transaction.
 * Two tags formats are allowed:
 * 1. "multiple interactions in one tx" format - where "Input" tag MUST be next to the "Contract" tag
 *    See more at https://github.com/ArweaveTeam/SmartWeave/pull/51
 * 2. "traditional" format - one interaction per one transaction - where tags order does not matter.
 *
 * More on Discord: https://discord.com/channels/357957786904166400/756557551234973696/885388585023463424
 */
export declare class TagsParser {
    private readonly logger;
    getInputTag(interactionTransaction: GQLNodeInterface, contractTxId: string): GQLTagInterface;
    isInteractWrite(interactionTransaction: GQLNodeInterface, contractTxId: string): boolean;
    getInteractWritesContracts(interactionTransaction: GQLNodeInterface): string[];
    getContractTag(interactionTransaction: GQLNodeInterface): string;
    getContractsWithInputs(interactionTransaction: GQLNodeInterface): Map<string, GQLTagInterface>;
    isEvmSigned(interactionTransaction: GQLNodeInterface): boolean;
    static hasMultipleInteractions(interactionTransaction: GQLNodeInterface): boolean;
    decodeTags(tx: Transaction): GQLTagInterface[];
    getTag(tx: Transaction, name: string): any;
    hasVrfTag(interaction: GQLNodeInterface): boolean;
}
//# sourceMappingURL=TagsParser.d.ts.map