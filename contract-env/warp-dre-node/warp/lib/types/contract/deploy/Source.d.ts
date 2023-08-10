/// <reference types="node" />
import { ArWallet } from './CreateContract';
import { CustomSignature } from '../Signature';
import { Transaction } from '../../utils/types/arweave-types';
import { Signer, DataItem } from 'warp-arbundles';
export interface SourceData {
    src: string | Buffer;
    wasmSrcCodeDir?: string;
    wasmGlueCode?: string;
}
export interface Source {
    /**
     * Allows to create contract source - either creates a contract source transaction when `disableBundling` is set to `true` or in local
     * environment or - creates a contracts source data item when bundling is enabled. It adds contract source specific tags and signs the
     * transaction/data item.
     * @param sourceData - contract source data {@link SourceData},
     * @param wallet - either Arweave wallet, custom signature or signer {@link SignatureProvider},
     * @param disableBundling - by default bundling is enabled and contract source data item is being created, one can manually disable bundling,
     * bundling is also disabled in local environment.
     *
     * Returns promise of type {@link DataItem} or {@link Transaction}
     */
    createSource(sourceData: SourceData, wallet: ArWallet | CustomSignature | Signer, disableBundling?: boolean): Promise<DataItem | Transaction>;
    /**
     * Allows to save contract source. It takes contract source created and signed as a data item or transaction and posts it to Warp Gateway
     * so it can be uploaded to Bundlr (when bundling is enabled) or posts it directly to Arweave.
     * @param source - contract source data item or transaction
     * @param disableBundling - by default bundling is enabled and contract source data item is being posted to Warp Gateway and uploaded to
     * Bundlr, one can manually disable bundling, bundling is also disabled in local environment.
     */
    saveSource(source: DataItem | Transaction, disableBundling?: boolean): Promise<string>;
}
//# sourceMappingURL=Source.d.ts.map