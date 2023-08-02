import { WarpLogger } from 'warp-contracts';
import Bundlr from '@bundlr-network/client';
import fs from 'fs';
import { TaskRunner } from '../gateway/tasks/TaskRunner';
import { GatewayContext } from '../gateway/init';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { BUNDLR_NODE1_URL } from '../constants';

const BUNDLR_CHECK_INTERVAL = 3600000;

export async function runBundlrCheck(context: GatewayContext) {
  await TaskRunner.from('[bundlr balance check]', checkBalance, context).runSyncEvery(BUNDLR_CHECK_INTERVAL, true);
}

export function initBundlr(logger: WarpLogger): { bundlr: Bundlr; jwk: JWKInterface } {
  const jwk = JSON.parse(fs.readFileSync('.secrets/warp-wallet-jwk.json').toString());
  const bundlr = new Bundlr(BUNDLR_NODE1_URL, 'arweave', jwk, {
    timeout: 5000,
  });
  logger.info('Running bundlr on', {
    address: bundlr.address,
    currency: bundlr.currency,
  });

  return { bundlr, jwk };
}

async function checkBalance(context: GatewayContext) {
  const { bundlr, logger } = context;
  logger.debug('Checking Bundlr balance');

  // Check your balance
  const balance = await bundlr.getLoadedBalance();
  logger.debug('Current Bundlr balance', balance);

  // If balance is < 0.5 AR
  if (balance.isLessThan(5e11)) {
    logger.debug('Funding Bundlr');
    // Fund your account with 0.5 AR
    //const fundResult = await bundlr.fund(5e11);
    //logger.debug("Fund result", fundResult);
  }
}
