import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';
import { isTxIdValid } from '../../../utils';

export async function contractWithSourceRoute_v2(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { txId } = ctx.query;

  if (!isTxIdValid(txId as string)) {
    logger.error('Incorrect contract transaction id.');
    ctx.status = 500;
    ctx.body = { message: 'Incorrect contract transaction id.' };
    return;
  }

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
          SELECT c.contract_id                                                                     as "txId",
                 c.bundler_contract_tx_id                                                          as "bundlerTxId",
                 s.src_tx_id                                                                       as "srcTxId",
                 (case when s.src_content_type = 'application/javascript' then s.src else null end)  as src,
                 (case when s.src_content_type = 'application/wasm' then s.src_binary else null end) as "srcBinary",
                 c.init_state                                                                      as "initState",
                 c.owner                                                                           as "owner",
                 c.pst_ticker                                                                      as "pstTicker",
                 c.pst_name                                                                        as "pstName",
                 s.src_wasm_lang                                                                   as "srcWasmLang",
                 c.contract_tx                                                                     as "contractTx",
                 s.src_tx                                                                          as "srcTx",
                 c.testnet                                                                         as "testnet",
                 c.manifest                                                                        as "manifest",
                 c.block_timestamp                                                                 as "blockTimestamp" 
          FROM contracts c 
          JOIN contracts_src s on c.src_tx_id = s.src_tx_id
          WHERE contract_id = ?;
      `,
      txId
    );

    const srcResult = await dbSource.raw(
      `
        SELECT  s.src_tx_id                                                                         as "srcTxId", 
                i.sort_key                                                                          as "sortKey",
                i.block_timestamp                                                                   as "blockTimestamp",
                (case when s.src_content_type = 'application/javascript' then s.src else null end)  as src,
                (case when s.src_content_type = 'application/wasm' then s.src_binary else null end) as "srcBinary",
                s.src_wasm_lang                                                                     as "srcWasmLang"
        FROM interactions i
        JOIN contracts_src s on s.src_tx_id = i.evolve
        WHERE i.evolve IS NOT NULL and i.contract_id = ? ORDER BY i.sort_key DESC;`,
      txId
    );

    if (result?.rows[0].src == null && result?.rows[0].srcBinary == null) {
      ctx.status = 500;
      ctx.body = { message: 'Contract not properly indexed.' };
    } else {
      ctx.body = {
        ...result?.rows[0],
        evolvedSrc: srcResult.rows,
      };
      logger.debug('Contract data loaded in', benchmark.elapsed());
    }
  } catch (e: any) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
