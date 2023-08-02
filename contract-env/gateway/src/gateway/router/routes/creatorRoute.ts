import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';
import { isTxIdValid } from '../../../utils';

const MAX_TRANSACTIONS_PER_PAGE = 5000;

export async function creatorRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { id, page, limit, txType } = ctx.query;

  const parsedPage = page ? parseInt(page as string) : 1;

  const parsedLimit = limit
    ? Math.min(parseInt(limit as string), MAX_TRANSACTIONS_PER_PAGE)
    : MAX_TRANSACTIONS_PER_PAGE;

  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  const bindings: any[] = [];
  bindings.push(id);
  !txType && bindings.push(id);
  parsedPage && bindings.push(parsedLimit);
  parsedPage && bindings.push(offset);

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
      WITH all_transactions AS (${
        txType != 'contract'
          ? `SELECT 
        interaction_id AS id, 
        bundler_tx_id AS bundler_id, 
        block_height, 
        interaction->'block'->>'timestamp' AS block_timestamp, 
        'interaction' AS type 
        FROM interactions 
        where owner = ?`
          : ''
      }
      ${!txType ? 'UNION all' : ''}
      ${
        txType != 'interaction'
          ? `SELECT 
        contract_id AS id, 
        bundler_contract_tx_id AS bundler_id, 
        block_height, 
        block_timestamp::text AS block_timestamp, 
        'contract' AS type 
        FROM contracts where owner = ?`
          : ''
      })
        SELECT *, COUNT(*) OVER() AS total FROM all_transactions ORDER BY all_transactions.block_timestamp DESC LIMIT ? OFFSET ?;`,
      bindings
    );

    const total = result?.rows?.length > 0 ? parseInt(result.rows[0].total) : 0;

    ctx.body = {
      paging: {
        total,
        limit: parsedLimit,
        items: result?.rows.length,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
      },
      transactions: result?.rows,
    };

    logger.debug(`Owner's transactions loaded in ${benchmark.elapsed()}`);
  } catch (e: any) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
