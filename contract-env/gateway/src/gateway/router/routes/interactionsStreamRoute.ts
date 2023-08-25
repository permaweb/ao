import Router from '@koa/router';
import { stringify } from 'JSONStream';

export async function interactionsStreamRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { contractId, confirmationStatus, from, to } = ctx.query;

  logger.debug('Interactions stream route', {
    contractId,
    confirmationStatus,
    from,
    to,
  });

  const parsedConfirmationStatus = confirmationStatus
    ? confirmationStatus == 'not_corrupted'
      ? ['confirmed', 'not_processed']
      : [confirmationStatus]
    : undefined;

  const bindings: any[] = [];
  bindings.push(contractId);
  from && bindings.push(from as string);
  to && bindings.push(to as string);

  try {
    const result: any = dbSource
      .raw(
        `
          SELECT interaction
          FROM interactions
          WHERE contract_id = ? ${
            parsedConfirmationStatus
              ? ` AND confirmation_status IN (${parsedConfirmationStatus.map((status) => `'${status}'`).join(', ')})`
              : ''
          } ${from ? ' AND block_height >= ?' : ''} ${to ? ' AND block_height <= ?' : ''}
          ORDER BY sort_key ASC;
      `,
        bindings
      )
      .stream() // note: https://www.npmjs.com/package/pg-query-stream is required for stream to work
      .pipe(stringify());

    ctx.set('Content-Type', 'application/json; charset=utf-8');
    ctx.set('Transfer-Encoding', 'chunked');

    ctx.body = result;
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
