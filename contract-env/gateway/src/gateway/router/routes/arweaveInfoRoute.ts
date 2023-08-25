import Router from '@koa/router';
import { getCachedNetworkData } from '../../tasks/networkInfoCache';

export async function arweaveInfoRoute(ctx: Router.RouterContext) {
  const { logger } = ctx;

  const result = getCachedNetworkData().cachedNetworkInfo;
  if (result == null) {
    logger.error('Network info not yet available.');
    ctx.status = 500;
    ctx.body = { message: 'Network info not yet available.' };
  } else {
    logger.debug('Returning network info with height', result.height);
    ctx.body = {
      ...result,
    };
  }
}

export async function arweaveBlockRoute(ctx: Router.RouterContext) {
  const { logger } = ctx;

  const result = getCachedNetworkData().cachedBlockInfo;
  if (result == null) {
    logger.error('Block info not yet available.');
    ctx.status = 500;
    ctx.body = { message: 'Block info not yet available.' };
  } else {
    logger.debug('Returning block info with block height', result.height);
    ctx.body = {
      ...result,
    };
  }
}
