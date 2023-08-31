/* eslint-disable */
import { SourceImpl } from './SourceImpl';
import {
  ArWallet,
  BundlrNodeType,
  BUNDLR_NODES,
  ContractData,
  ContractDeploy,
  CreateContract,
  CustomSignature,
  FromSrcTxContractData,
  LoggerFactory,
  Signature,
  SourceData,
  Transaction,
  Warp,
  WarpFetchWrapper,
  SMART_WEAVE_TAGS,
  WARP_TAGS,
  isBrowser,
  Tag,
  getJsonResponse
} from 'warp-contracts';
import { createData, Signer, DataItem } from 'warp-arbundles';
import { isSigner } from '../../deploy/utils';

export class CreateContractImpl implements CreateContract {
  private readonly logger = LoggerFactory.INST.create('DefaultCreateContract');
  private readonly source: SourceImpl;

  private signature: Signature;
  private readonly warpFetchWrapper: WarpFetchWrapper;

  constructor(private readonly warp: Warp) {
    this.deployFromSourceTx = this.deployFromSourceTx.bind(this);
    this.source = new SourceImpl(this.warp);
    this.warpFetchWrapper = new WarpFetchWrapper(this.warp);
  }

  async deploy(contractData: ContractData, disableBundling?: boolean): Promise<ContractDeploy> {
    const { wallet, initState, tags, transfer, data, evaluationManifest } = contractData;

    let srcTx: Transaction | DataItem;

    const effectiveUseBundler =
      disableBundling == undefined ? this.warp.definitionLoader.type() == 'warp' : !disableBundling;

    srcTx = await this.source.createSource(contractData, wallet, !effectiveUseBundler);

    if (!effectiveUseBundler) {
      await this.source.saveSource(srcTx, true);
    }

    this.logger.debug('Creating new contract');

    const srcTxId = await srcTx.id;
    return await this.deployFromSourceTx(
      {
        srcTxId,
        wallet,
        initState,
        tags,
        transfer,
        data,
        evaluationManifest
      },
      !effectiveUseBundler,
      srcTx
    );
  }

  async deployFromSourceTx(
    contractData: FromSrcTxContractData,
    disableBundling?: boolean,
    srcTx: Transaction | DataItem = null
  ): Promise<ContractDeploy> {
    this.logger.debug('Creating new contract from src tx');
    const { wallet, srcTxId, initState, data } = contractData;

    let contract;
    let responseOk: boolean;
    let response: { status: number; statusText: string; data: any };

    const effectiveUseBundler =
      disableBundling == undefined ? this.warp.definitionLoader.type() == 'warp' : !disableBundling;

    if (!effectiveUseBundler && isSigner(wallet)) {
      throw new Error('Only ArWallet | CustomSignature wallet type are allowed when bundling is disabled.');
    }

    if (effectiveUseBundler && !isSigner(wallet)) {
      throw new Error('Only Signer wallet type is allowed when bundling is enabled.');
    }

    const contractTags = {
      contract: [
        { name: SMART_WEAVE_TAGS.APP_NAME, value: 'SmartWeaveContract' },
        { name: SMART_WEAVE_TAGS.APP_VERSION, value: '0.3.0' },
        { name: SMART_WEAVE_TAGS.CONTRACT_SRC_TX_ID, value: srcTxId },
        { name: SMART_WEAVE_TAGS.SDK, value: 'Warp' },
        { name: WARP_TAGS.NONCE, value: Date.now().toString() }
      ],
      contractData: [
        { name: SMART_WEAVE_TAGS.CONTENT_TYPE, value: data && data['Content-Type'] },
        { name: WARP_TAGS.INIT_STATE, value: initState }
      ],
      contractNonData: [{ name: SMART_WEAVE_TAGS.CONTENT_TYPE, value: 'application/json' }],
      contractTestnet: [{ name: WARP_TAGS.WARP_TESTNET, value: '1.0.0' }],
      contractEvaluationManifest: [{ name: WARP_TAGS.MANIFEST, value: JSON.stringify(contractData.evaluationManifest) }]
    };

    if (!effectiveUseBundler) {
      ({ contract, responseOk } = await this.deployContractArweave(effectiveUseBundler, contractData, contractTags));
    } else {
      ({ contract, responseOk } = await this.deployContractBundlr(contractData, contractTags, srcTx));
    }

    const contractTxId = await contract.id;
    if (responseOk) {
      return { contractTxId, srcTxId };
    } else {
      throw new Error(
        `Unable to write Contract. Arweave responded with status ${response.status}: ${response.statusText}`
      );
    }
  }

  async deployBundled(rawDataItem: Buffer): Promise<ContractDeploy> {
    return await getJsonResponse(
      fetch(`${this.warp.gwUrl()}/gateway/contracts/deploy-bundled`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        },
        body: rawDataItem
      })
    );
  }

  async register(id: string, bundlrNode: BundlrNodeType): Promise<ContractDeploy> {
    return await getJsonResponse(
      fetch(`${this.warp.gwUrl()}/gateway/contracts/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({ id, bundlrNode })
      })
    );
  }

  async createSource(
    sourceData: SourceData,
    wallet: ArWallet | CustomSignature | Signer,
    disableBundling: boolean = false
  ): Promise<Transaction | DataItem> {
    return this.source.createSource(sourceData, wallet, disableBundling);
  }

  async saveSource(srcTx: Transaction | DataItem, disableBundling?: boolean): Promise<string> {
    return this.source.saveSource(srcTx, disableBundling);
  }

  private async postContract(contract: Buffer, src: Buffer = null): Promise<any> {
    let body: any = {
      contract
    };
    if (src) {
      body = {
        ...body,
        src
      };
    }

    return await getJsonResponse(
      this.warpFetchWrapper.fetch(`${this.warp.gwUrl()}/gateway/v2/contracts/deploy`, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'Content-Type': 'application/json',
          Accept: 'application/json'
        }
      })
    );
  }

  private async deployContractArweave(
    effectiveUseBundler: boolean,
    contractData: FromSrcTxContractData,
    contractTags: any
  ): Promise<{ contract: Transaction; responseOk: boolean }> {
    const { wallet, initState, transfer, data, tags } = contractData;

    this.signature = new Signature(this.warp, wallet);
    !isSigner(wallet) && this.signature.checkNonArweaveSigningAvailability(effectiveUseBundler);
    const signer = this.signature.signer;
    !isSigner(wallet) && this.signature.checkNonArweaveSigningAvailability(effectiveUseBundler);

    let contract = await this.warp.arweave.createTransaction({ data: data?.body || initState });

    if (+transfer?.winstonQty > 0 && transfer.target.length) {
      this.logger.debug('Creating additional transaction with AR transfer', transfer);
      contract = await this.warp.arweave.createTransaction({
        data: data?.body || initState,
        target: transfer.target,
        quantity: transfer.winstonQty
      });
    }

    if (tags?.length) {
      for (const tag of tags) {
        contract.addTag(tag.name.toString(), tag.value.toString());
      }
    }
    contractTags.contract.forEach((t) => contract.addTag(t.name, t.value));
    if (data) {
      contractTags.contractData.forEach((t) => contract.addTag(t.name, t.value));
    } else {
      contractTags.contractNonData.forEach((t) => contract.addTag(t.name, t.value));
    }

    if (this.warp.environment === 'testnet') {
      contractTags.contractTestnet.forEach((t) => contract.addTag(t.name, t.value));
    }

    if (contractData.evaluationManifest) {
      contractTags.contractEvaluationManifest.forEach((t) => contract.addTag(t.name, t.value));
    }

    await signer(contract);

    const response = await this.warp.arweave.transactions.post(contract);
    return { contract, responseOk: response.status === 200 || response.status === 208 };
  }

  private async deployContractBundlr(
    contractData: FromSrcTxContractData,
    contractTags: any,
    src: Transaction | DataItem = null
  ): Promise<{ contract: DataItem; responseOk: boolean }> {
    const { wallet, initState, data, tags } = contractData;

    const contractDataItemTags: Tag[] = [...contractTags.contract];
    if (tags?.length) {
      for (const tag of tags) {
        contractDataItemTags.push(new Tag(tag.name.toString(), tag.value.toString()));
      }
    }
    if (data) {
      contractTags.contractData.forEach((t) => contractDataItemTags.push(new Tag(t.name, t.value)));
    } else {
      contractTags.contractNonData.forEach((t) => contractDataItemTags.push(new Tag(t.name, t.value)));
    }

    if (this.warp.environment === 'testnet') {
      contractTags.contractTestnet.forEach((t) => contractDataItemTags.push(new Tag(t.name, t.value)));
    }

    if (contractData.evaluationManifest) {
      contractTags.contractEvaluationManifest.forEach((t) => contractDataItemTags.push(new Tag(t.name, t.value)));
    }

    let contract: DataItem;

    if (isBrowser() && (wallet as Signer).signer && (wallet as Signer).signer.signDataItem) {
      contract = await (wallet as Signer).signDataItem(data?.body || initState, contractDataItemTags);
    } else {
      contract = createData(data?.body || initState, wallet as Signer, { tags: contractDataItemTags });
      await contract.sign(wallet as Signer);
    }

    await this.postContract(contract.getRaw(), src?.getRaw());
    return { contract, responseOk: true };
  }

  isBundlrNodeType(value: string): value is BundlrNodeType {
    return BUNDLR_NODES.includes(value as BundlrNodeType);
  }
}
