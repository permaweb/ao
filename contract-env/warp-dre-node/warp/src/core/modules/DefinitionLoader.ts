import { ContractCache, ContractDefinition, ContractSource, SrcCache } from '../ContractDefinition';
import { GwTypeAware } from './InteractionsLoader';
import { WarpAware } from '../Warp';
import { BasicSortKeyCache } from '../../cache/BasicSortKeyCache';

/**
 * Implementors of this interface are responsible for loading contract's definitions -
 * its source code, info about owner, initial state, etc.
 * See ContractDefinition type for more details regarding what data is being loaded.
 */
export interface DefinitionLoader extends GwTypeAware, WarpAware {
  load<State>(contractTxId: string, evolvedSrcTxId?: string): Promise<ContractDefinition<State>>;

  loadContractSource(srcTxId: string): Promise<ContractSource>;

  setCache(cache: BasicSortKeyCache<ContractCache<unknown>>): void;

  // Cache for storing common source code or binaries
  setSrcCache(cacheSrc?: BasicSortKeyCache<SrcCache>): void;

  getCache(): BasicSortKeyCache<ContractCache<unknown>>;

  getSrcCache(): BasicSortKeyCache<SrcCache>;
}
