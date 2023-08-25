import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';

const MAX_CONTRACTS_PER_PAGE = 100;

export async function contractsRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { contractType, sourceType, page, limit, testnet } = ctx.query;

  logger.debug('Contracts route', { contractType, sourceType, page, limit });

  const parsedPage = page ? parseInt(page as string) : 1;
  const parsedLimit = limit ? Math.min(parseInt(limit as string), MAX_CONTRACTS_PER_PAGE) : MAX_CONTRACTS_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  const bindings: any[] = [];
  contractType && bindings.push(contractType);
  sourceType && bindings.push(sourceType);
  parsedPage && bindings.push(parsedLimit);
  parsedPage && bindings.push(offset);

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
          SELECT c.contract_id                                                   AS contract,
                 c.owner                                                         AS owner,
                 c.type                                                          AS contract_type,
                 c.pst_ticker                                                    AS pst_ticker,
                 c.pst_name                                                      AS pst_name,
                 c.testnet                                                       AS testnet,
                 s.src_content_type                                              AS src_content_type,
                 s.src_wasm_lang                                                 AS src_wasm_lang,
                 count(i.contract_id)                                            AS interactions,
                 count(case when i.confirmation_status = 'corrupted' then 1 end) AS corrupted,
                 count(case when i.confirmation_status = 'confirmed' then 1 end) AS confirmed,
                 max(i.block_height)                                             AS last_interaction_height,
                 count(*) OVER ()                                                AS total
          FROM contracts c
                   LEFT JOIN interactions i
                             ON c.contract_id = i.contract_id
                   LEFT JOIN contracts_src s
                             ON c.src_tx_id = s.src_tx_id
          WHERE c.contract_id != ''
            AND c.type != 'error' 
                ${contractType ? ' AND c.type = ?' : ''} 
                ${sourceType ? ' AND s.src_content_type = ?' : ''}
                ${testnet ? ' AND c.testnet IS NOT NULL' : ''}
          GROUP BY c.contract_id, c.owner, c.type, c.pst_ticker, c.pst_name, s.src_content_type, s.src_wasm_lang
          ORDER BY last_interaction_height DESC NULLS LAST, interactions DESC NULLS LAST ${
            parsedPage ? ' LIMIT ? OFFSET ?' : ''
          };
      `,
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
      contracts: result?.rows,
    };
    logger.debug('Contracts loaded in', benchmark.elapsed());
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
