import Router from '@koa/router';
import { evalType } from '../../tasks/contractsMetadata';
import { BUNDLR_NODE1_URL } from '../../../constants';
import { DataItem } from 'arbundles';
import rawBody from 'raw-body';
import { getCachedNetworkData } from '../../tasks/networkInfoCache';
import { publishContract, sendNotification } from '../../publisher';
import { evalManifest, WarpDeployment } from './deployContractRoute';
import { ContractInsert } from '../../../db/insertInterfaces';

export async function deployBundledRoute(ctx: Router.RouterContext) {
  const { logger, dbSource, arweave, bundlr } = ctx;

  let initStateRaw, dataItem;

  try {
    const rawDataItem: Buffer = await rawBody(ctx.req);
    dataItem = new DataItem(rawDataItem);
    const isValid = await dataItem.isValid();
    if (!isValid) {
      ctx.throw(400, 'Data item binary is not valid.');
    }

    const areContractTagsValid = await verifyContractTags(dataItem, ctx);
    if (!areContractTagsValid) {
      ctx.throw(400, 'Contract tags are not valid.');
    }

    const bundlrResponse = await bundlr.uploader.uploadTransaction(dataItem, { getReceiptSignature: true });

    if (bundlrResponse.status !== 200 || !bundlrResponse.data.public || !bundlrResponse.data.signature) {
      throw new Error(
        `Bundlr did not upload transaction correctly. Bundlr responded with status ${bundlrResponse.status}.`
      );
    }

    logger.debug('Data item successfully bundled.', {
      id: bundlrResponse.data.id,
    });

    const srcTxId = dataItem.tags.find((t) => t.name == 'Contract-Src')!.value;
    initStateRaw = dataItem.tags.find((t) => t.name == 'Init-State')!.value;
    const initState = JSON.parse(initStateRaw);
    const type = evalType(initState);
    const ownerAddress = await arweave.wallets.ownerToAddress(dataItem.owner);
    const contentType = dataItem.tags.find((t) => t.name == 'Content-Type')!.value;
    const testnet = getTestnetTag(dataItem.tags);
    const manifest = evalManifest(dataItem.tags);
    const blockHeight = getCachedNetworkData().cachedNetworkInfo.height;
    const blockTimestamp = getCachedNetworkData().cachedBlockInfo.timestamp;
    const syncTimestamp = Date.now();

    const insert: ContractInsert = {
      contract_id: bundlrResponse.data.id,
      src_tx_id: srcTxId,
      init_state: initState,
      owner: ownerAddress,
      type: type,
      pst_ticker: type == 'pst' ? initState?.ticker : null,
      pst_name: type == 'pst' ? initState?.name : null,
      block_height: blockHeight,
      block_timestamp: blockTimestamp,
      content_type: contentType,
      contract_tx: { tags: dataItem.toJSON().tags },
      bundler_contract_tx_id: bundlrResponse.data.id,
      bundler_contract_node: BUNDLR_NODE1_URL,
      testnet,
      deployment_type: WarpDeployment.Direct,
      manifest,
      sync_timestamp: syncTimestamp,
    };

    await dbSource.insertContract(insert);
    sendNotification(ctx, bundlrResponse.data.id, { initState, tags: dataItem.tags });
    publishContract(
      ctx,
      bundlrResponse.data.id,
      ownerAddress,
      type,
      blockHeight,
      blockTimestamp,
      WarpDeployment.Direct,
      syncTimestamp,
      testnet
    );

    logger.info('Contract successfully deployed.', {
      contractTxId: bundlrResponse.data.id,
    });

    ctx.body = {
      contractTxId: bundlrResponse.data.id,
    };
  } catch (e: any) {
    logger.error('Error while inserting bundled transaction.', {
      dataItemId: dataItem?.id,
      contractTx: dataItem?.toJSON(),
      initStateRaw: initStateRaw,
    });
    logger.error(e);
    ctx.body = e;
    ctx.status = e.status ? e.status : 500;
  }
}

export async function verifyContractTags(dataItem: DataItem, ctx: Router.RouterContext) {
  const tags = dataItem.tags;
  const tagsIncluded = [
    { name: 'App-Name', value: 'SmartWeaveContract' },
    { name: 'App-Version', value: '0.3.0' },
    { name: 'Content-Type', value: 'application/x.arweave-manifest+json' },
  ];
  const nameTagsIncluded = ['Contract-Src', 'Init-State', 'Title', 'Description', 'Type'];
  if (tags.some((t) => t.name == tagsIncluded[2].name && t.value != tagsIncluded[2].value)) {
    ctx.throw(400, `Incorrect Content-Type tag. application/x.arweave-manifest+json is required.`);
  }
  const contractTagsIncluded =
    tagsIncluded.every((ti) => tags.some((t) => t.name == ti.name && t.value == ti.value)) &&
    nameTagsIncluded.every((nti) => tags.some((t) => t.name == nti));

  return contractTagsIncluded;
}

export function getTestnetTag(tags: { name: string; value: string }[]) {
  const testnetTag = tags.find((t) => t.name == 'Warp-Testnet');
  if (testnetTag) {
    return testnetTag.value;
  } else {
    return null;
  }
}
