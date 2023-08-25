import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';

/**
 * @deprecated Following route has been replaced with `contractWithSourceRoute` and is not used in the SDK
 * anymore. It should be deleted in the future, leaving due to backwards compatibility of the introduction of
 * the new endpoint.
 */

export async function contractRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { id } = ctx.params;

  if (id?.length != 43) {
    ctx.body = {};
    return;
  }

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
          SELECT c.contract_id                                                                     as "txId",
                 c.src_tx_id                                                                       as "srcTxId",
                 (case when s.src_content_type = 'application/javascript' then s.src else null end)  as src,
                 (case when s.src_content_type = 'application/wasm' then s.src_binary else null end) as "srcBinary",
                 c.init_state                                                                      as "initState",
                 c.owner                                                                           as "owner",
                 c.pst_ticker                                                                      as "pstTicker",
                 c.pst_name                                                                        as "pstName",
                 s.src_wasm_lang                                                                   as "srcWasmLang",
                 c.contract_tx                                                                     as "contractTx",
                 s.src_tx                                                                          as "srcTx",
                 c.testnet                                                                         as "testnet"
          FROM contracts c 
          JOIN contracts_src s on c.src_tx_id = s.src_tx_id
          WHERE contract_id = ?;
      `,
      [id]
    );

    if (result?.rows[0].src == null && result?.rows[0].srcBinary == null) {
      ctx.status = 500;
      ctx.body = { message: 'Contract not properly indexed.' };
    } else {
      ctx.body = result?.rows[0];
      logger.debug('Contract data loaded in', benchmark.elapsed());
    }
  } catch (e: any) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
