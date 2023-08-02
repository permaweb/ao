import Router from '@koa/router';
import Transaction from 'arweave/node/lib/transaction';
import { parseFunctionName } from '../../tasks/syncTransactions';
import Arweave from 'arweave';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { arrayToHex, Benchmark, GQLTagInterface, SmartWeaveTags, WarpLogger } from 'warp-contracts';
import { getCachedNetworkData } from '../../tasks/networkInfoCache';
import Bundlr from '@bundlr-network/client';
import { BlockData } from 'arweave/node/blocks';
import { VRF } from '../../init';
import { isTxIdValid } from '../../../utils';
import { BUNDLR_NODE1_URL } from '../../../constants';
import { publishInteraction, sendNotification } from '../../publisher';
import { Knex } from 'knex';
import { InteractionInsert } from '../../../db/insertInterfaces';

const { Evaluate } = require('@idena/vrf-js');

export type VrfData = {
  index: string;
  proof: string;
  bigint: string;
  pubkey: string;
};

export async function sequencerRoute(ctx: Router.RouterContext) {
  const { sLogger, arweave, bundlr, jwk, vrf, lastTxSync, dbSource, signatureVerification } = ctx;
  const trx: Knex.Transaction = await dbSource.primaryDb.transaction();

  try {
    const cachedNetworkData = getCachedNetworkData();

    const benchmark = Benchmark.measure();

    const transaction: Transaction = new Transaction({ ...ctx.request.body });
    sLogger.debug('New sequencer tx', transaction.id);

    const originalSignature = transaction.signature;
    const originalOwner = transaction.owner;

    if (cachedNetworkData == null) {
      throw new Error('Network or block info not yet cached.');
    }

    const currentHeight = cachedNetworkData.cachedBlockInfo.height;
    sLogger.debug(`Sequencer height: ${transaction.id}: ${currentHeight}`);

    if (!currentHeight) {
      throw new Error('Current height not set');
    }

    const currentBlockTimestamp = cachedNetworkData.cachedBlockInfo.timestamp;
    if (!currentBlockTimestamp) {
      throw new Error('Current block timestamp not set');
    }

    const currentBlockId = cachedNetworkData.cachedNetworkInfo.current;
    if (!currentBlockId) {
      throw new Error('Current block not set');
    }

    let {
      contractTag,
      inputTag,
      requestVrfTag,
      internalWrites,
      decodedTags,
      tags,
      originalAddress,
      isEvmSigner,
      testnetVersion,
    } = await prepareTags(
      sLogger,
      transaction,
      originalOwner,
      currentHeight,
      currentBlockId,
      currentBlockTimestamp,
      arweave
    );

    const contractLastSortKey: string | null = await lastTxSync.acquireMutex(contractTag, trx);

    const millis = Date.now();
    const sortKey = await createSortKey(arweave, jwk, currentBlockId, millis, transaction.id, currentHeight);

    tags.push({ name: 'Sequencer-Mills', value: '' + millis });
    tags.push({ name: 'Sequencer-Sort-Key', value: sortKey });
    tags.push({ name: 'Sequencer-Last-Sort-Key', value: contractLastSortKey || 'null' });
    let vrfData = null;
    if (requestVrfTag !== '') {
      const vrfGen = generateVrfTags(sortKey, vrf, arweave);
      tags.push(...vrfGen.vrfTags);
      vrfData = vrfGen.vrfData;
    }

    sLogger.info('Original address before create interaction', originalAddress);
    const interaction = createInteraction(
      transaction,
      originalAddress,
      decodedTags,
      currentHeight,
      currentBlockId,
      cachedNetworkData.cachedBlockInfo,
      sortKey,
      vrfData,
      isEvmSigner ? originalSignature : null,
      testnetVersion,
      contractLastSortKey
    );

    let verified = false;
    if (isEvmSigner) {
      verified = await signatureVerification.process(interaction);
    } else {
      verified = await arweave.transactions.verify(transaction);
    }

    if (!verified) {
      throw new Error('Naughty boy (interaction)!');
    } else {
      sLogger.info('Transaction verified properly');
    }

    // TODO: add fallback to other bundlr nodes.
    const { bTx, bundlrResponse } = await uploadToBundlr(transaction, bundlr, tags, sLogger);

    const parsedInput = JSON.parse(inputTag);
    const functionName = parseFunctionName(inputTag, sLogger);
    let evolve: string | null;
    evolve = functionName == 'evolve' && parsedInput.value && isTxIdValid(parsedInput.value) ? parsedInput.value : null;

    if (isEvmSigner) {
      sLogger.info(`Interaction for ${transaction.id}`, JSON.stringify(interaction));
    }

    const sequencerInsert = {
      original_sig: originalSignature,
      original_owner: originalOwner,
      original_address: originalAddress,
      sequence_block_id: currentBlockId,
      sequence_block_height: currentHeight,
      sequence_transaction_id: transaction.id,
      sequence_millis: '' + millis,
      sequence_sort_key: sortKey,
      bundler_tx_id: bTx.id,
      bundler_response: JSON.stringify(bundlrResponse.data),
      last_sort_key: contractLastSortKey,
    };

    const interactionsInsert: InteractionInsert = {
      interaction_id: transaction.id,
      interaction: JSON.stringify(interaction),
      block_height: currentHeight,
      block_timestamp: currentBlockTimestamp,
      block_id: currentBlockId,
      contract_id: contractTag,
      function: functionName,
      input: inputTag,
      confirmation_status: 'confirmed',
      confirming_peer: BUNDLR_NODE1_URL,
      source: 'redstone-sequencer',
      bundler_tx_id: bTx.id,
      interact_write: internalWrites,
      sort_key: sortKey,
      evolve: evolve,
      testnet: testnetVersion,
      last_sort_key: contractLastSortKey,
      owner: originalOwner,
      sync_timestamp: millis,
    };

    await dbSource.insertSequencerAndInteraction(sequencerInsert, interactionsInsert, trx, sLogger);

    sLogger.debug('Transaction successfully bundled', {
      id: transaction.id,
      bundled_tx_id: bTx.id,
    });

    ctx.body = bundlrResponse.data;

    sLogger.info('Total sequencer processing', benchmark.elapsed());

    sendNotification(ctx, contractTag, undefined, interaction);
    publishInteraction(
      ctx,
      contractTag,
      interaction,
      sortKey,
      contractLastSortKey,
      functionName,
      'redstone-sequencer',
      millis,
      testnetVersion
    );
  } catch (e) {
    if (!trx.isCompleted()) {
      await trx.rollback();
    }
    sLogger.error('Error while inserting bundled transaction');
    sLogger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}

function createInteraction(
  transaction: Transaction,
  originalAddress: string,
  decodedTags: GQLTagInterface[],
  currentHeight: number,
  currentBlockId: string,
  blockInfo: BlockData,
  sortKey: string,
  vrfData: VrfData | null,
  signature: string | null,
  testnetVersion: string | null,
  lastSortKey: string | null
) {
  const interaction: any = {
    id: transaction.id,
    owner: { address: originalAddress },
    recipient: transaction.target,
    tags: decodedTags,
    block: {
      height: currentHeight,
      id: currentBlockId,
      timestamp: blockInfo.timestamp,
    },
    fee: {
      winston: transaction.reward,
    },
    quantity: {
      winston: transaction.quantity,
    },
    sortKey: sortKey,
    source: 'redstone-sequencer',
    vrf: vrfData,
    testnet: testnetVersion,
    lastSortKey,
  };

  if (signature) {
    interaction.signature = signature;
  }

  return interaction;
}

function generateVrfTags(sortKey: string, vrf: VRF, arweave: Arweave) {
  const privateKey = vrf.privKey.toArray();
  const data = arweave.utils.stringToBuffer(sortKey);
  const [index, proof] = Evaluate(privateKey, data);

  const vrfData: VrfData = {
    index: arweave.utils.bufferTob64Url(index),
    proof: arweave.utils.bufferTob64Url(proof),
    bigint: bufToBn(index).toString(),
    pubkey: vrf.pubKeyHex,
  };

  return {
    vrfTags: [
      { name: 'vrf-index', value: vrfData.index },
      { name: 'vrf-proof', value: vrfData.proof },
      { name: 'vrf-bigint', value: vrfData.bigint },
      { name: 'vrf-pubkey', value: vrfData.pubkey },
    ],
    vrfData,
  };
}

function bufToBn(buf: Array<number>) {
  const hex: string[] = [];
  const u8 = Uint8Array.from(buf);

  u8.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });

  return BigInt('0x' + hex.join(''));
}

async function prepareTags(
  logger: any,
  transaction: Transaction,
  originalOwner: string,
  currentHeight: number,
  currentBlockId: string,
  currentBlockTimestamp: number,
  arweave: Arweave
) {
  let contractTag: string = '',
    inputTag: string = '',
    requestVrfTag = '',
    originalAddress = '',
    isEvmSigner = false,
    testnetVersion = null;

  const decodedTags: GQLTagInterface[] = [];

  const internalWrites: string[] = [];

  for (const tag of transaction.tags) {
    const key = tag.get('name', { decode: true, string: true });
    const value = tag.get('value', { decode: true, string: true });
    if (key == SmartWeaveTags.CONTRACT_TX_ID) {
      contractTag = value;
    }
    if (key == SmartWeaveTags.INPUT) {
      inputTag = value;
    }
    if (key == SmartWeaveTags.INTERACT_WRITE) {
      internalWrites.push(value);
    }
    if (key == SmartWeaveTags.REQUEST_VRF) {
      requestVrfTag = value;
    }
    if (key == 'Signature-Type' && value == 'ethereum') {
      logger.info(`Signature type for ${transaction.id}`, value);
      originalAddress = originalOwner;
      logger.info(`original address type for ${transaction.id}`, originalOwner);
      isEvmSigner = true;
    }
    if (key == 'Warp-Testnet') {
      testnetVersion = value;
    }
    decodedTags.push({
      name: key,
      value: value,
    });
  }

  if (!isEvmSigner) {
    originalAddress = await arweave.wallets.ownerToAddress(originalOwner);
  }

  const tags = [
    { name: 'Sequencer', value: 'RedStone' },
    { name: 'Sequencer-Owner', value: originalAddress },
    { name: 'Sequencer-Tx-Id', value: transaction.id },
    { name: 'Sequencer-Block-Height', value: '' + currentHeight },
    { name: 'Sequencer-Block-Id', value: currentBlockId },
    { name: 'Sequencer-Block-Timestamp', value: '' + currentBlockTimestamp },
    ...decodedTags,
  ];

  return {
    contractTag,
    inputTag,
    requestVrfTag,
    internalWrites,
    decodedTags,
    tags,
    originalAddress,
    isEvmSigner,
    testnetVersion,
  };
}

export async function uploadToBundlr(
  transaction: Transaction,
  bundlr: Bundlr,
  tags: GQLTagInterface[],
  logger: WarpLogger
) {
  const uploadBenchmark = Benchmark.measure();

  const bTx = bundlr.createTransaction(JSON.stringify(transaction), { tags });
  await bTx.sign();
  const bundlrResponse = await bundlr.uploader.uploadTransaction(bTx, { getReceiptSignature: true });

  logger.debug('Uploading to bundlr', {
    elapsed: uploadBenchmark.elapsed(),
    id: bundlrResponse.data.id,
    status: bundlrResponse.status,
  });

  if (bundlrResponse.status !== 200 || !bundlrResponse.data.signature) {
    throw new Error(
      `Bundlr did not upload transaction ${bTx?.id} correctly. Bundlr responded with status ${bundlrResponse.status}.`
    );
  }

  return { bTx, bundlrResponse };
}

async function createSortKey(
  arweave: Arweave,
  jwk: JWKInterface,
  blockId: string,
  mills: number,
  transactionId: string,
  blockHeight: number
) {
  const blockHashBytes = arweave.utils.b64UrlToBuffer(blockId);
  const txIdBytes = arweave.utils.b64UrlToBuffer(transactionId);
  const jwkDBytes = arweave.utils.b64UrlToBuffer(jwk.d as string);
  const concatenated = arweave.utils.concatBuffers([blockHashBytes, txIdBytes, jwkDBytes]);
  const hashed = arrayToHex(await arweave.crypto.hash(concatenated));

  const blockHeightString = `${blockHeight}`.padStart(12, '0');

  return `${blockHeightString},${mills},${hashed}`;
}
