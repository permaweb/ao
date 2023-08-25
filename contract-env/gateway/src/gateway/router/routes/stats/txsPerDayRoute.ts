import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';

export async function txsPerDayRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;
  const { testnet } = ctx.query;

  try {
    const benchmark = Benchmark.measure();
    const contracts: any = await dbSource.raw(
      `
        WITH contracts_per_day AS (
            SELECT date(to_timestamp((block_timestamp)::integer)) as date, contract_id as interaction
            FROM contracts 
            WHERE testnet ${testnet ? ' IS NOT NULL' : ' IS NULL'}
        )
        SELECT date, count(*) as per_day FROM contracts_per_day
        GROUP BY date
        ORDER BY date ASC;
      `
    );
    const interactions: any = await dbSource.raw(
      `
        WITH transactions_per_day AS (
            SELECT date(to_timestamp((block_timestamp)::integer)) as date, interaction_id as interaction
            FROM interactions 
            WHERE testnet ${testnet ? ' IS NOT NULL' : ' IS NULL'}
        )
        SELECT date, count(*) as per_day FROM transactions_per_day
        GROUP BY date
        ORDER BY date ASC;
        `
    );
    ctx.body = {
      contracts_per_day: contracts.rows,
      interactions_per_day: interactions.rows,
    };
    logger.debug('Contracts stats loaded in', benchmark.elapsed());
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
