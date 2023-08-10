import Arweave from 'arweave';
import { GQLEdgeInterface } from '../../../legacy/gqlResult';
import { arrayToHex } from '../../../legacy/utils';
import { LoggerFactory } from '../../../logging/LoggerFactory';
import { InteractionsSorter } from '../InteractionsSorter';

// note: this (i.e. padding to 13 digits) should be safe between years ~1966 and ~2286
const firstSortKeyMs = ''.padEnd(13, '0');
const lastSortKeyMs = ''.padEnd(13, '9');
export const defaultArweaveMs = ''.padEnd(13, '0');

export const sortingFirst = ''.padEnd(64, '0');
export const sortingLast = ''.padEnd(64, 'z');

export const genesisSortKey = `${''.padStart(12, '0')},${firstSortKeyMs},${sortingFirst}`;
export const lastPossibleSortKey = `${''.padStart(12, '9')},${lastSortKeyMs},${sortingLast}`;

/**
 * implementation that is based on current's SDK sorting alg.
 */
export class LexicographicalInteractionsSorter implements InteractionsSorter {
  private readonly logger = LoggerFactory.INST.create('LexicographicalInteractionsSorter');

  constructor(private readonly arweave: Arweave) {}

  async sort(transactions: GQLEdgeInterface[]): Promise<GQLEdgeInterface[]> {
    const copy = [...transactions];
    const addKeysFuncs = copy.map((tx) => this.addSortKey(tx));
    await Promise.all(addKeysFuncs);

    return copy.sort((a, b) => a.node.sortKey.localeCompare(b.node.sortKey));
  }

  public async createSortKey(blockId: string, transactionId: string, blockHeight: number, dummy = false) {
    const blockHashBytes = this.arweave.utils.b64UrlToBuffer(blockId);
    const txIdBytes = this.arweave.utils.b64UrlToBuffer(transactionId);
    const concatenated = this.arweave.utils.concatBuffers([blockHashBytes, txIdBytes]);
    const hashed = arrayToHex(await this.arweave.crypto.hash(concatenated));

    const blockHeightString = `${blockHeight}`.padStart(12, '0');

    const arweaveMs = dummy ? lastSortKeyMs : defaultArweaveMs;

    return `${blockHeightString},${arweaveMs},${hashed}`;
  }

  public extractBlockHeight(sortKey?: string): number | null {
    // I feel sorry for myself...
    return sortKey ? parseInt(sortKey.split(',')[0]) : null;
  }

  private async addSortKey(txInfo: GQLEdgeInterface) {
    const { node } = txInfo;

    // might have been already set by the Warp Sequencer
    const sortKey = txInfo.node.sortKey;

    if (sortKey) {
      txInfo.node.sortKey = sortKey;
      this.logger.debug('Using sortKey from sequencer', txInfo.node.sortKey);
    } else {
      txInfo.node.sortKey = await this.createSortKey(node.block.id, node.id, node.block.height);
    }
  }

  generateLastSortKey(blockHeight: number): string {
    const blockHeightString = `${blockHeight}`.padStart(12, '0');
    return `${blockHeightString},${lastSortKeyMs},${sortingLast}`;
  }
}
