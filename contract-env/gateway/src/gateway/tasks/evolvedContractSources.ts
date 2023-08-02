import Arweave from 'arweave';
import Transaction from 'arweave/node/lib/transaction';
import { ContractDefinitionLoader, ContractSource, SmartWeaveTags, TagsParser, WasmSrc } from 'warp-contracts';
import { ContractSourceInsert } from '../../db/insertInterfaces';
import { GatewayContext } from '../init';
import { TaskRunner } from './TaskRunner';

const CONTRACTS_SOURCE_INTERVAL_MS = 10000;

export async function runEvolvedContractSourcesTask(context: GatewayContext) {
  await TaskRunner.from('[evolved contract sources]', loadEvolvedContractSources, context).runSyncEvery(
    CONTRACTS_SOURCE_INTERVAL_MS
  );
}

async function loadEvolvedContractSources(context: GatewayContext) {
  const { logger, dbSource, arweave } = context;
  const definitionLoader = new ContractDefinitionLoader(arweave, 'mainnet');
  const tagsParser = new TagsParser();

  const result: { evolve: string }[] = (
    await dbSource.raw(
      `
          SELECT evolve
          FROM interactions
          WHERE evolve NOT IN (SELECT src_tx_id from contracts_src)
          AND evolve IS NOT NULL;
      `
    )
  ).rows;

  const missing = result?.length || 0;
  logger.info(`Loading ${missing} evolved contract sources.`);

  if (missing == 0) {
    return;
  }

  for (const row of result) {
    logger.debug(`Loading evolved contract source: ${row.evolve}.`);
    const srcTxId = row.evolve;

    let src, srcWasmLang, contractType, srcTx, srcBinary;

    let loaded = false;

    try {
      ({ src, srcWasmLang, contractType, srcTx } = await definitionLoader.loadContractSource(srcTxId));
      await insertSourceToDb(srcTxId, contractType, srcTx, src, srcBinary, srcWasmLang, context, tagsParser);
      loaded = true;
    } catch (e) {
      logger.debug(`Cannot load evolved contract source transaction. ${srcTxId}.`, e);
    }

    if (!loaded) {
      try {
        ({ src, srcBinary, srcTx, srcWasmLang, contractType, srcBinary } = await loadSourceDataItem(
          srcTxId,
          tagsParser
        ));
        await insertSourceToDb(srcTxId, contractType, srcTx, src, srcBinary, srcWasmLang, context, tagsParser);
        loaded = true;
      } catch (e) {
        logger.debug(`Cannot load evolved contract source data item ${srcTxId}.`, e);
      }
    }

    if (!loaded) {
      try {
        let contracts_src_insert: any = {
          src_tx_id: srcTxId,
          src: 'error',
        };

        await dbSource.insertContractSource(contracts_src_insert);
        logger.debug(`${row.evolve} evolved contract source inserted into db as errored.`);
      } catch (e) {
        logger.error(`Error while loading evolved contract source ${srcTxId}`, e);
      }
    }
  }
  logger.info(`Loaded ${missing} evolved contract sources.`);
}

export async function loadSourceDataItem(srcTxId: string, tagsParser: TagsParser) {
  const jsonSrc = await fetch(`https://arweave.net/${srcTxId}`).then((res) => {
    return res.json();
  });
  const srcTx = new Transaction(jsonSrc);
  let src, srcBinary, srcWasmLang, srcContentType;

  srcContentType = tagsParser.getTag(srcTx, SmartWeaveTags.CONTENT_TYPE).value;
  if (srcContentType == 'application/javascript') {
    src = Arweave.utils.bufferToString(srcTx.data);
  } else {
    const bufData = Buffer.from(srcTx.data);
    const wasmSrc = new WasmSrc(bufData);
    srcBinary = await wasmSrc.sourceCode();
    srcWasmLang = tagsParser.getTag(srcTx, SmartWeaveTags.WASM_LANG).value;
  }

  return {
    src,
    srcBinary,
    srcTx,
    srcWasmLang,
    contractType: srcContentType == 'application/javascript' ? 'js' : 'wasm',
  };
}

export async function insertSourceToDb(
  srcTxId: string,
  contractType: string,
  srcTx: Transaction,
  src: any,
  srcBinary: any,
  srcWasmLang: string | null,
  ctx: GatewayContext,
  tagsParser: TagsParser
): Promise<void> {
  const tx = new Transaction(srcTx);

  const decodedTags = tagsParser.decodeTags(tx);
  const signatureType = decodedTags.find((t) => t.name == SmartWeaveTags.SIGNATURE_TYPE);
  const testnet = decodedTags.find((t) => t.name == SmartWeaveTags.WARP_TESTNET);

  let contracts_src_insert: any = {
    src_tx_id: srcTxId,
    src_content_type: contractType == 'js' ? 'application/javascript' : 'application/wasm',
    src_tx: srcTx,
    owner:
      signatureType && signatureType.name == 'ethereum'
        ? srcTx.owner
        : await ctx.arweave.wallets.ownerToAddress(srcTx.owner),
    testnet: testnet ? testnet : null,
  };

  if (contractType == 'js') {
    contracts_src_insert = {
      ...contracts_src_insert,
      src: src,
    };
  } else {
    contracts_src_insert = {
      ...contracts_src_insert,
      src_binary: srcBinary ? srcBinary : await ctx.arweaveWrapper.txData(srcTxId),
      src_wasm_lang: srcWasmLang,
    };
  }

  ctx.logger.debug(`Inserting ${srcTxId} evolved contract source into db`);

  await ctx.dbSource.insertContractSource(contracts_src_insert);

  ctx.logger.debug(`${srcTxId} evolved contract source inserted into db`);
}
