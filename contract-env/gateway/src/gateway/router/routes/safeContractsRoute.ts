import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';

export async function safeContractsRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
          SELECT i.contract_id, count(i) AS interactions
          FROM contracts c
                   JOIN interactions i ON i.contract_id = c.contract_id
                   JOIN contracts_src s ON s.src_tx_id = c.src_tx_id
          WHERE 
              (s.src_content_type = 'application/javascript' 
                   AND (s.src NOT LIKE '%readContractState%' AND s.src NOT LIKE '%unsafeClient%'))
          OR s.src_content_type = 'application/wasm'
          GROUP BY i.contract_id
          HAVING count(i) < 20000 AND count(i) >= 1
          ORDER BY count(i) DESC;
      `
    );
    ctx.body = result?.rows;
    logger.debug('Safe contracts loaded in', benchmark.elapsed());
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
