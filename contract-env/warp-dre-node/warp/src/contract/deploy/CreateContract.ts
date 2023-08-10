import { JWKInterface } from 'arweave/node/lib/wallet';
import { WarpPluginType } from '../../core/WarpPlugin';
import { EvaluationOptions } from '../../core/modules/StateEvaluator';
import { Source } from './Source';
import { Signer } from 'warp-arbundles';
import { CustomSignature } from '../Signature';
import { Tag } from '../../utils/types/arweave-types';

export type Tags = Tag[];

export type ArWallet = JWKInterface | 'use_wallet';

export type ContractType = 'js' | 'wasm';

export type ArTransfer = {
  target: string;
  winstonQty: string;
};

export const emptyTransfer: ArTransfer = {
  target: '',
  winstonQty: '0'
};

export type EvaluationManifest = {
  evaluationOptions?: Partial<EvaluationOptions>;
  plugins?: WarpPluginType[];
};

export const BUNDLR_NODES = ['node1', 'node2'] as const;
export type BundlrNodeType = (typeof BUNDLR_NODES)[number];

export interface CommonContractData {
  wallet: ArWallet | CustomSignature | Signer;
  initState: string;
  tags?: Tags;
  transfer?: ArTransfer;
  data?: {
    'Content-Type': string;
    body: string | Buffer;
  };
  evaluationManifest?: EvaluationManifest;
}

export interface ContractData extends CommonContractData {
  src: string | Buffer;
  wasmSrcCodeDir?: string;
  wasmGlueCode?: string;
}

export interface FromSrcTxContractData extends CommonContractData {
  srcTxId: string;
}

export interface ContractDeploy {
  contractTxId: string;
  srcTxId?: string;
}

export interface CreateContract extends Source {
  /**
   * Allows to deploy contract. By default bundling is enabled. In this case, contract source data item and contract data item are
   * created and posted to Warp Gateway where they're uploaded to Bundlr and indexed in the gateway. In case of bundling being disabled
   * (or in local environment) contract transaction and contract source transaction are created, signed and posted directly to Arweave.
   * @param contractData - contract data {@link ContractData},
   * @param disableBundling - by default bundling is enabled and contract and contract source data item are being created, one can
   * manually disable bundling, bundling is also disabled in local environment.
   *
   * Returns promise of type {@link ContractDeploy}
   */
  deploy(contractData: ContractData, disableBundling?: boolean): Promise<ContractDeploy>;

  /**
   * Allows to deploy contract from already existing source, contract source id is passed in a tag. By default bundling is enabled.
   * In this case, contract data item is created and posted to Warp Gateway where it's uploaded to Bundlr and indexed in the gateway.
   * In case of bundling being disabled(or in local environment) contract transaction is created, signed and posted directly to Arweave.
   * @param contractData - contract data {@link FromSrcTxContractData},
   * @param disableBundling - by default bundling is enabled and contract data item is created, one can manually disable bundling,
   * bundling is also disabled in local environment.
   *
   * Returns promise of type {@link ContractDeploy}
   */
  deployFromSourceTx(contractData: FromSrcTxContractData, disableBundling?: boolean): Promise<ContractDeploy>;

  /**
   * Takes raw contract data item as an argument and posts it to Warp Gateway where it is uploaded to Bundlr and indexed. Only AtomicNFTs
   * data items (containing dedicated tags) are accepted.
   * @param rawDataItem
   *
   * Returns promise of type {@link ContractDeploy}
   */
  deployBundled(rawDataItem: Buffer): Promise<ContractDeploy>;

  /**
   * Registers Bundlr transaction in Warp Gateway. One needs to upload contract transaction to Bundlr and pass its id in the method along
   * with {@link BundlrNodeType}. For now, only AtomicNFTs contracts are accepted (dedicated tags are verified in the gateway).
   * @param id - Bunldr's id of the uploaded contract transaction
   * @param bundlrNode - {@link BundlrNodeType}
   */
  register(id: string, bundlrNode: BundlrNodeType): Promise<ContractDeploy>;
}
