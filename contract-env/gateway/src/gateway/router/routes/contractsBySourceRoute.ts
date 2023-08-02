import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';
import { isTxIdValid } from '../../../utils';

const MAX_INTERACTIONS_PER_PAGE = 5000;

export async function contractsBySourceRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { id, page, limit, sort } = ctx.query;

  const parsedPage = page ? parseInt(page as string) : 1;

  const parsedLimit = limit
    ? Math.min(parseInt(limit as string), MAX_INTERACTIONS_PER_PAGE)
    : MAX_INTERACTIONS_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  if (!isTxIdValid(id as string)) {
    logger.error('Incorrect contract source transaction id.');
    ctx.status = 500;
    ctx.body = { message: 'Incorrect contract source transaction id.' };
    return;
  }

  logger.info(`contractsBySourceRoute [ip: ${ctx.request?.ip}, srcId: ${id}]`);

  const bindings: any = [];
  id && bindings.push(id);
  parsedPage && bindings.push(parsedLimit);
  parsedPage && bindings.push(offset);
  id && bindings.push(id);

  try {
    const benchmark = Benchmark.measure();

    const result: any = await dbSource.raw(
      `
          with c as (select contract_id, owner, bundler_contract_tx_id, block_height, block_timestamp
                     from contracts
                     where src_tx_id = ?
                       and type != 'error'
              ${sort == 'desc' || sort == 'asc' ? `ORDER BY block_height ${sort.toUpperCase()}, contract_id` : ''}
              LIMIT ? OFFSET ?),
                  
              src as (select count(*) AS total
                from contracts
                where src_tx_id = ?
                  and type <> 'error'),
              
              interactions as (select c.contract_id, count(*) as interactions
          from c
              join interactions on interactions.contract_id = c.contract_id
          group by c.contract_id)
          SELECT c.contract_id               AS "contractId",
                 c.owner                     AS "owner",
                 c.bundler_contract_tx_id    AS "bundlerTxId",
                 c.block_height              AS "blockHeight",
                 c.block_timestamp           AS "blockTimestamp",
                 coalesce(i.interactions, 0) AS "interactions",
                 coalesce(src.total, 0)      AS "total"
          from c
                   LEFT JOIN interactions i ON c.contract_id = i.contract_id
                   LEFT JOIN src ON TRUE
              ${sort == 'desc' || sort == 'asc' ? `ORDER BY c.block_height ${sort.toUpperCase()}, c.contract_id` : ''};
        `,
      bindings
    );

    console.log(result.rows.length);
    const total = result?.rows?.length > 0 ? result?.rows[0].total : 0;

    ctx.body = {
      paging: {
        total,
        limit: parsedLimit,
        items: result?.rows.length,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
      },
      contracts: result?.rows,
    };
    logger.debug('Source loaded in', benchmark.elapsed());
  } catch (e: any) {
    logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
