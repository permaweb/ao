import Router from '@koa/router';
import { Benchmark } from 'warp-contracts';
import { isTxIdValid } from '../../../utils';

export async function nftsOwnedByAddressRoute(ctx: Router.RouterContext) {
  const { logger, dbSource } = ctx;

  const { address } = ctx.params;

  if (!isTxIdValid(address)) {
    ctx.status = 500;
    ctx.body = { message: 'Wrong wallet address format.' };
    return;
  }

  const { srcTxId } = ctx.query;
  if (!isTxIdValid(srcTxId as string)) {
    ctx.status = 500;
    ctx.body = { message: 'Wrong src tx id address format.' };
    return;
  }

  try {
    const benchmark = Benchmark.measure();
    const result: any = await dbSource.raw(
      `
          WITH wallet_balances AS (
              SELECT contract_id as contract,
                     init_state->'ticker' AS ticker,
                     init_state->'name' AS name,
                     (init_state->'balances'->?)::integer AS balance
              FROM contracts
              WHERE src_tx_id = ?)
          SELECT * from wallet_balances WHERE balance = 1;
      `,
      [address, srcTxId]
    );
    ctx.body = result?.rows;
    logger.debug('Nfts ownership loaded', benchmark.elapsed());
  } catch (e: any) {
    ctx.logger.error(e);
    ctx.status = 500;
    ctx.body = { message: e };
  }
}
