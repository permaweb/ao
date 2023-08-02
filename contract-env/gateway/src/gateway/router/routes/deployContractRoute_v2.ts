import Router from '@koa/router';
import { evalType } from '../../tasks/contractsMetadata';
import { BUNDLR_NODE1_URL } from '../../../constants';
import { Bundle, DataItem } from 'arbundles';
import { ContractSource, sleep, SmartWeaveTags } from 'warp-contracts';
import { getCachedNetworkData } from '../../tasks/networkInfoCache';
import { publishContract, sendNotification } from '../../publisher';
import { evalManifest, WarpDeployment } from './deployContractRoute';
import Arweave from 'arweave';
import { SignatureConfig } from 'arbundles/src/constants';
import { Contract, utils } from 'ethers';
import { longTo32ByteArray } from 'arbundles/src/utils';
import { ContractInsert, ContractSourceInsert } from '../../../db/insertInterfaces';

export async function deployContractRoute_v2(ctx: Router.RouterContext) {
  const { logger, arweave, dbSource } = ctx;

  let initStateRaw,
    contractDataItem,
    srcDataItem,
    contracts_src_insert: Partial<ContractSourceInsert> = {};

  try {
    contractDataItem = new DataItem(Buffer.from(ctx.request.body.contract));
    const isContractValid = await contractDataItem.isValid();
    if (!isContractValid) {
      ctx.throw(400, 'Contract data item binary is not valid.');
    }
    const areContractTagsValid = await verifyDeployTags(contractDataItem, { contract: true });
    if (!areContractTagsValid) {
      ctx.throw(400, 'Contract tags are not valid.');
    }

    if (ctx.request.body.src) {
      srcDataItem = new DataItem(Buffer.from(ctx.request.body.src));
      const isSrcValid = await srcDataItem.isValid();
      if (!isSrcValid) {
        ctx.throw(400, 'Source data item binary is not valid.');
      }

      const areSrcTagsValid = await verifyDeployTags(srcDataItem);
      if (!areSrcTagsValid) {
        ctx.throw(400, 'Contract source tags are not valid.');
      }
    }

    if (srcDataItem) {
      let srcId, srcContentType, src, srcBinary, srcWasmLang, bundlrSrcTxId, srcOwner, srcTestnet;
      srcId = srcDataItem.id;
      logger.debug('New deploy source transaction', srcId);
      srcOwner = await determineOwner(srcDataItem, arweave);
      srcTestnet = getTestnetTag(srcDataItem.tags);
      srcContentType = srcDataItem.tags.find((t) => t.name == 'Content-Type')!.value;
      srcWasmLang = srcDataItem.tags.find((t) => t.name == SmartWeaveTags.WASM_LANG)?.value;
      if (srcContentType == 'application/javascript') {
        src = Arweave.utils.bufferToString(srcDataItem.rawData);
      } else {
        srcBinary = srcDataItem.rawData;
      }

      contracts_src_insert = {
        src_tx_id: srcId,
        owner: srcOwner,
        src: src || null,
        src_content_type: srcContentType,
        src_binary: srcBinary || null,
        src_wasm_lang: srcWasmLang || null,
        bundler_src_node: BUNDLR_NODE1_URL,
        src_tx: srcDataItem.toJSON(),
        testnet: srcTestnet,
        deployment_type: WarpDeployment.Direct,
      };
    }
    const bundlrResponse = await bundleAndUpload({ contract: contractDataItem, src: srcDataItem || null }, ctx);
    logger.debug('Contract successfully uploaded to Bundlr.', {
      contract_id: contractDataItem.id,
      src_id: srcDataItem?.id,
      bundled_tx_id: bundlrResponse.data.id,
    });

    if (srcDataItem) {
      contracts_src_insert = {
        ...contracts_src_insert,
        bundler_response: JSON.stringify(bundlrResponse?.data),
        bundler_src_tx_id: bundlrResponse.data.id,
      };
      await dbSource.insertContractSource(contracts_src_insert);
    }

    const srcId = contractDataItem.tags.find((t) => t.name == 'Contract-Src')!.value;
    initStateRaw = contractDataItem.tags.find((t) => t.name == 'Init-State')?.value;
    if (!initStateRaw) {
      initStateRaw = Arweave.utils.bufferToString(contractDataItem.rawData);
    }
    const initState = JSON.parse(initStateRaw);
    const type = evalType(initState);
    const ownerAddress = await determineOwner(contractDataItem, arweave);
    const contentType = contractDataItem.tags.find((t) => t.name == 'Content-Type')!.value;
    const testnet = getTestnetTag(contractDataItem.tags);
    const manifest = evalManifest(contractDataItem.tags);
    const blockHeight = getCachedNetworkData().cachedNetworkInfo.height;
    const blockTimestamp = getCachedNetworkData().cachedBlockInfo.timestamp;
    const syncTimestamp = Date.now();

    const insert: ContractInsert = {
      contract_id: contractDataItem.id,
      src_tx_id: srcId,
      init_state: initState,
      owner: ownerAddress,
      type: type,
      pst_ticker: type == 'pst' ? initState?.ticker : null,
      pst_name: type == 'pst' ? initState?.name : null,
      block_height: blockHeight,
      block_timestamp: blockTimestamp,
      content_type: contentType,
      contract_tx: { tags: contractDataItem.toJSON().tags },
      bundler_contract_tx_id: bundlrResponse.data.id,
      bundler_contract_node: BUNDLR_NODE1_URL,
      testnet,
      deployment_type: WarpDeployment.Direct,
      manifest,
      sync_timestamp: syncTimestamp,
    };

    await dbSource.insertContract(insert);

    sendNotification(ctx, contractDataItem.id, { initState, tags: contractDataItem.tags });
    publishContract(
      ctx,
      contractDataItem.id,
      ownerAddress!!,
      type,
      blockHeight,
      blockTimestamp,
      WarpDeployment.Direct,
      syncTimestamp,
      testnet
    );

    logger.info('Contract successfully deployed.', {
      contractTxId: contractDataItem.id,
      srcTxId: srcDataItem?.id || srcId,
      bundlrTxId: bundlrResponse?.data.id,
    });

    ctx.body = {
      contractTxId: contractDataItem.id,
      srcTxId: srcDataItem?.id || srcId,
      bundlrTxId: bundlrResponse.data.id,
    };
  } catch (e: any) {
    logger.error('Error while inserting bundled transaction.', {
      dataItemId: contractDataItem?.id,
      contract: contractDataItem?.toJSON(),
      initStateRaw: initStateRaw,
    });
    logger.error(e);
    ctx.body = e;
    ctx.status = e.status ? e.status : 500;
  }
}

export async function verifyDeployTags(dataItem: DataItem, opts?: { contract: boolean }) {
  const tags = dataItem.tags;

  const deployTags = [
    { name: SmartWeaveTags.APP_NAME, value: opts?.contract ? 'SmartWeaveContract' : 'SmartWeaveContractSource' },
    { name: SmartWeaveTags.APP_VERSION, value: '0.3.0' },
    { name: SmartWeaveTags.SDK, value: 'Warp' },
  ];

  const contractNameTags = ['Contract-Src', 'Nonce'];
  const sourceNameTags = ['Nonce', 'Content-Type'];
  const tagsIncluded =
    deployTags.every((dt) => tags.some((t) => t.name == dt.name && t.value == dt.value)) &&
    (opts?.contract ? contractNameTags : sourceNameTags).every((nti) => tags.some((t) => t.name == nti));

  return tagsIncluded;
}

export function getTestnetTag(tags: { name: string; value: string }[]) {
  const testnetTag = tags.find((t) => t.name == 'Warp-Testnet');
  if (testnetTag) {
    return testnetTag.value;
  } else {
    return null;
  }
}

export async function determineOwner(dataItem: DataItem, arweave: Arweave) {
  if (dataItem.signatureType == SignatureConfig.ARWEAVE) {
    return await arweave.wallets.ownerToAddress(dataItem.owner);
  } else if (dataItem.signatureType == SignatureConfig.ETHEREUM) {
    return utils.computeAddress(utils.hexlify(dataItem.rawOwner));
  }
}

export async function bundleAndUpload(
  dataItems: { contract: DataItem | null; src: DataItem | null },
  ctx: Router.RouterContext
) {
  const { bundlr } = ctx;
  const { contract, src } = dataItems;
  const dataItemsToUpload = [];
  contract && dataItemsToUpload.push(contract);
  src && dataItemsToUpload.push(src);
  const bundle = await bundleData(dataItemsToUpload);

  const bundlrTx = bundlr.createTransaction(bundle.getRaw(), {
    tags: [
      { name: 'Bundle-Format', value: 'binary' },
      { name: 'Bundle-Version', value: '2.0.0' },
      { name: 'App-Name', value: 'Warp' },
      { name: 'Action', value: 'WarpContractDeployment' },
    ],
  });
  await bundlrTx.sign();
  const bundlrResponse = await bundlr.uploader.uploadTransaction(bundlrTx, { getReceiptSignature: true });
  if (
    bundlrResponse.status !== 200 ||
    !bundlrResponse.data.public ||
    !bundlrResponse.data.signature ||
    !bundlrResponse.data.block
  ) {
    throw new Error(
      `Bundlr did not upload transaction correctly. Bundlr responded with status ${bundlrResponse.status}.`
    );
  }

  return bundlrResponse;
}

export async function bundleData(dataItems: DataItem[]): Promise<Bundle> {
  const headers = new Uint8Array(64 * dataItems.length);

  const binaries = await Promise.all(
    dataItems.map(async (d, index) => {
      const id = d.rawId;
      // Create header array
      const header = new Uint8Array(64);
      // Set offset
      header.set(longTo32ByteArray(d.getRaw().byteLength), 0);
      // Set id
      header.set(id, 32);
      // Add header to array of headers
      headers.set(header, 64 * index);
      // Convert to array for flattening
      return d.getRaw();
    })
  ).then((a) => {
    return Buffer.concat(a);
  });

  const buffer = Buffer.concat([longTo32ByteArray(dataItems.length), headers, binaries]);

  return new Bundle(buffer);
}
