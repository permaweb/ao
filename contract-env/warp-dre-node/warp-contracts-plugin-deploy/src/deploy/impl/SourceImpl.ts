/* eslint-disable */
import { Buffer } from 'warp-isomorphic';
import {
  LoggerFactory,
  Signature,
  Warp,
  ContractType,
  ArWallet,
  CustomSignature,
  TagsParser,
  Source,
  SourceData,
  Transaction,
  SMART_WEAVE_TAGS,
  WARP_TAGS,
  isBrowser,
  Tag,
  getJsonResponse,
  checkJsSrc
} from 'warp-contracts';
import { createData } from 'warp-arbundles';
import { isDataItem, isSigner } from '../../deploy/utils';
import { WasmHandler } from '../../deploy/wasm/WasmHandler';
import { DataItem, Signer } from 'warp-arbundles';

export class SourceImpl implements Source {
  private readonly logger = LoggerFactory.INST.create('Source');
  private signature: Signature;

  constructor(private readonly warp: Warp) {}

  async createSource(
    sourceData: SourceData,
    wallet: ArWallet | CustomSignature | Signer,
    disableBundling: boolean = false
  ): Promise<DataItem | Transaction> {
    this.logger.debug('Creating new contract source');

    const { src, wasmSrcCodeDir, wasmGlueCode } = sourceData;

    if (this.warp.environment == 'local') {
      disableBundling = true;
    }

    const effectiveUseBundler =
      disableBundling == undefined ? this.warp.definitionLoader.type() == 'warp' : !disableBundling;

    if (!effectiveUseBundler && isSigner(wallet)) {
      throw new Error('Only ArWallet | CustomSignature wallet type are allowed when bundling is disabled.');
    }

    if (effectiveUseBundler && !isSigner(wallet)) {
      throw new Error('Only Signer wallet type is allowed when bundling is enabled.');
    }

    const contractType: ContractType = src instanceof Buffer ? 'wasm' : 'js';
    if (contractType == 'js' && !checkJsSrc(sourceData.src as string, this.logger)) {
      throw new Error('JS contract source does not contain properly exported "handle" function');
    }

    let wasmData: Buffer = null;
    let srcWasmTags = [];

    if (contractType == 'wasm') {
      const wasmHandler = new WasmHandler(src, wasmSrcCodeDir, wasmGlueCode);
      ({ wasmData, srcWasmTags } = await wasmHandler.createWasmSrc());
    }

    const allData = contractType == 'wasm' ? wasmData : src;

    const srcTags = [
      new Tag(SMART_WEAVE_TAGS.APP_NAME, 'SmartWeaveContractSource'),
      new Tag(SMART_WEAVE_TAGS.APP_VERSION, '0.3.0'),
      new Tag(SMART_WEAVE_TAGS.SDK, 'Warp'),
      new Tag(WARP_TAGS.NONCE, Date.now().toString()),
      new Tag(SMART_WEAVE_TAGS.CONTENT_TYPE, contractType == 'js' ? 'application/javascript' : 'application/wasm')
    ];

    if (disableBundling) {
      return this.createSourceArweave(
        wallet as ArWallet | CustomSignature,
        allData,
        srcTags,
        srcWasmTags,
        contractType
      );
    } else {
      return await this.createSourceBundlr(wallet as Signer, srcTags, srcWasmTags, contractType, allData);
    }
  }

  async saveSource(src: DataItem | Transaction, disableBundling?: boolean): Promise<string> {
    this.logger.debug('Saving contract source', src.id);

    if (this.warp.environment == 'local') {
      disableBundling = true;
    }

    const effectiveUseBundler =
      disableBundling == undefined ? this.warp.definitionLoader.type() == 'warp' : !disableBundling;

    if (isDataItem(src) && !effectiveUseBundler) {
      throw new Error(`Unable to save data item when bundling is disabled.`);
    }

    if (!isDataItem(src)) {
      const tagsParser = new TagsParser();
      const signatureTag = tagsParser.getTag(src, WARP_TAGS.SIGNATURE_TYPE);
      if (signatureTag && signatureTag != 'arweave' && !effectiveUseBundler) {
        throw new Error(`Unable to save source with signature type: ${signatureTag} when bundling is disabled.`);
      }
    }

    let responseOk: boolean;
    let response: { status: number; statusText: string; data: any };

    if (effectiveUseBundler) {
      const result = await this.postSource(src.getRaw());
      this.logger.debug(result);
      responseOk = true;
    } else {
      response = await this.warp.arweave.transactions.post(src);
      responseOk = response.status === 200 || response.status === 208;
    }

    if (responseOk) {
      return src.id;
    } else {
      throw new Error(
        `Unable to write Contract Source. Arweave responded with status ${response.status}: ${response.statusText}`
      );
    }
  }

  private async postSource(srcDataItem: Buffer): Promise<any> {
    return await getJsonResponse(
      fetch(`${this.warp.gwUrl()}/gateway/v2/sources/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          Accept: 'application/json'
        },
        body: srcDataItem
      })
    );
  }

  private async createSourceArweave(
    wallet: ArWallet | CustomSignature,
    data: string | Buffer,
    srcTags: { name: string; value: string }[],
    srcWasmTags: { name: string; value: string }[],
    contractType: string
  ): Promise<Transaction> {
    this.signature = new Signature(this.warp, wallet as ArWallet | CustomSignature);
    if (this.signature.type !== 'arweave') {
      throw new Error(`Unable to use signing function of type: ${this.signature.type}.`);
    }
    const signer = this.signature.signer;

    const srcTx = await this.warp.arweave.createTransaction({ data });
    srcTags.forEach((t) => srcTx.addTag(t.name, t.value));

    if (contractType == 'wasm') {
      srcWasmTags.forEach((t) => srcTx.addTag(t.name, t.value));
    }

    if (this.warp.environment === 'testnet') {
      srcTx.addTag(WARP_TAGS.WARP_TESTNET, '1.0.0');
    }

    await signer(srcTx);

    this.logger.debug('Posting transaction with source');

    return srcTx;
  }

  private async createSourceBundlr(
    wallet: Signer,
    srcTags: Tag[],
    srcWasmTags: Tag[],
    contractType: string,
    data: string | Buffer
  ): Promise<DataItem> {
    const srcDataItemTags = [...srcTags];
    if (contractType == 'wasm') {
      srcWasmTags.forEach((t) => srcDataItemTags.push(new Tag(t.name, t.value)));
    }

    if (this.warp.environment === 'testnet') {
      srcDataItemTags.push(new Tag(WARP_TAGS.WARP_TESTNET, '1.0.0'));
    }

    let srcDataItem: DataItem;

    if (isBrowser() && wallet.signer && wallet.signer.signDataItem) {
      srcDataItem = await wallet.signDataItem(data, srcDataItemTags);
    } else {
      srcDataItem = createData(data, wallet, { tags: srcDataItemTags });
      await srcDataItem.sign(wallet);
    }

    this.logger.debug('Posting transaction with source');

    return srcDataItem;
  }
}
