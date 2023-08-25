import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';

const MAX_INTERACTIONS_PER_PAGE = 5000;

export async function interactionsSonar(ctx: Router.RouterContext) {
  const { dbSource, logger } = ctx;

  const { contractId, confirmationStatus, page, limit, from, to, source } = ctx.query;

  const parsedPage = page ? parseInt(page as string) : 1;

  const parsedLimit = limit
    ? Math.min(parseInt(limit as string), MAX_INTERACTIONS_PER_PAGE)
    : MAX_INTERACTIONS_PER_PAGE;
  const offset = parsedPage ? (parsedPage - 1) * parsedLimit : 0;

  const parsedConfirmationStatus = confirmationStatus
    ? confirmationStatus == 'not_corrupted'
      ? ['confirmed', 'not_processed']
      : [confirmationStatus]
    : undefined;

  const bindings: any[] = [];
  bindings.push(contractId);
  bindings.push(contractId);
  from && bindings.push(from as string);
  to && bindings.push(to as string);
  source && bindings.push(source as string);
  parsedPage && bindings.push(parsedLimit);
  parsedPage && bindings.push(offset);

  try {
    const query = `
          SELECT interaction, 
                 confirmation_status, 
                 sort_key, 
                 confirming_peer,
                 confirmations,
                 bundler_tx_id 
          FROM interactions 
            WHERE (contract_id = ? OR interact_write @> ARRAY[?]) 
          ${
            parsedConfirmationStatus
              ? ` AND confirmation_status IN (${parsedConfirmationStatus.map((status) => `'${status}'`).join(', ')})`
              : ''
          } 
          ${from ? ' AND sort_key > ?' : ''} 
          ${to ? ' AND sort_key <= ?' : ''} 
          ${source ? `AND source = ?` : ''} 
          ORDER BY sort_key DESC ${parsedPage ? ' LIMIT ? OFFSET ?' : ''};
      `;

    const result: any = await dbSource.raw(query, bindings);

    const totalInteractions: any = await dbSource.raw(
      `
          SELECT count(case when confirmation_status = 'corrupted' then 1 else null end)     AS corrupted,
                 count(case when confirmation_status = 'confirmed' then 1 else null end)     AS confirmed,
                 count(case when confirmation_status = 'not_processed' then 1 else null end) AS not_processed,
                 count(case when confirmation_status = 'forked' then 1 else null end)        AS forked
          FROM interactions
          WHERE (contract_id = ? OR interact_write @> ARRAY[?]);
      `,
      [contractId, contractId]
    );

    const total =
      parseInt(totalInteractions.rows[0].confirmed) +
      parseInt(totalInteractions.rows[0].corrupted) +
      parseInt(totalInteractions.rows[0].not_processed) +
      parseInt(totalInteractions.rows[0].forked);

    const benchmark = Benchmark.measure();
    ctx.body = {
      paging: {
        total,
        limit: parsedLimit,
        items: result?.rows.length,
        page: parsedPage,
        pages: Math.ceil(total / parsedLimit),
      },
      ...(totalInteractions && {
        total: {
          confirmed: totalInteractions.rows[0].confirmed,
          corrupted: totalInteractions.rows[0].corrupted,
          not_processed: totalInteractions.rows[0].not_processed,
          forked: totalInteractions.rows[0].forked,
        },
      }),

      interactions: result?.rows?.map((r: any) => ({
        status: r.confirmation_status,
        confirming_peers: r.confirming_peer,
        confirmations: r.confirmations,
        interaction: {
          ...r.interaction,
          bundlerTxId: r.bundler_tx_id,
          sortKey: r.sort_key,
        },
      })),
    };

    logger.info('Mapping interactions: ', benchmark.elapsed());
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
