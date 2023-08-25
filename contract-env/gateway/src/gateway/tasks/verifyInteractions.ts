import axios from 'axios';
import { TaskRunner } from './TaskRunner';
import { GatewayContext } from '../init';

export const MIN_CONFIRMATIONS = 10;
const PARALLEL_REQUESTS = 15;
const TX_CONFIRMATION_SUCCESSFUL_ROUNDS = 1;
const TX_CONFIRMATION_MAX_ROUNDS = 2;
const TX_CONFIRMATION_MAX_ROUND_TIMEOUT_MS = 3000;
const CONFIRMATIONS_INTERVAL_MS = 10000;

let lastVerificationHeight = 0;

type ConfirmationRoundResult = {
  txId: string;
  peer: string;
  result: string;
  confirmations: number;
}[];

export async function runVerifyInteractionsTask(context: GatewayContext) {
  await TaskRunner.from('[verify interactions]', verifyInteractions, context).runSyncEvery(CONFIRMATIONS_INTERVAL_MS);
}

async function verifyInteractions(context: GatewayContext) {
  const { logger, dbSource, arweaveWrapper } = context;

  let currentNetworkHeight;
  try {
    currentNetworkHeight = (await arweaveWrapper.info()).height as number;
  } catch (e: any) {
    logger.error('Error from Arweave', e.message);
    return;
  }

  const safeNetworkHeight = currentNetworkHeight - MIN_CONFIRMATIONS;
  logger.info('Verify confirmations params:', {
    currentNetworkHeight,
    safeNetworkHeight,
    lastVerificationHeight,
  });

  // note: as the "status" endpoint for arweave.net sometime returns 504 - Bad Gateway for corrupted transactions,
  // we need to ask peers directly...
  // https://discord.com/channels/357957786904166400/812013044892172319/917819482787958806
  // only 7 nodes are currently fully synced, duh...
  let peers: { peer: string }[];
  try {
    peers = (
      await dbSource.raw(`
        SELECT peer
        FROM peers
        WHERE height > 0
          AND blacklisted = false
        ORDER BY height - blocks ASC, response_time ASC
        LIMIT ${PARALLEL_REQUESTS};
    `)
    ).rows;
  } catch (e: any) {
    logger.error('Error while fetching peers', e.message);
    return;
  }

  if (peers.length < PARALLEL_REQUESTS) {
    logger.warn('Arweave peers not loaded yet.');
    return;
  }

  // note:
  // 1. excluding Kyve contracts, as they moved to Moonbeam (and their contracts have the most interactions)
  // 2. excluding Koi contracts (well, those with the most interactions, as there are dozens of Koi contracts)
  // - as they're using their own infrastructure and probably won't be interested in using this solution.
  // TODO: make this list configurable.
  let interactionsToCheck: { block_height: number; interaction_id: string }[];
  try {
    interactionsToCheck = (
      await dbSource.raw(
        `
            SELECT block_height, interaction_id
            FROM interactions
            WHERE block_height < (SELECT max(block_height) FROM interactions) - ?
              AND block_height >= ?
              AND confirmation_status = 'not_processed'
              AND source = 'arweave'
              AND contract_id NOT IN (
                                      'LkfzZvdl_vfjRXZOPjnov18cGnnK3aDKj0qSQCgkCX8', /* kyve  */
                                      'l6S4oMyzw_rggjt4yt4LrnRmggHQ2CdM1hna2MK4o_c', /* kyve  */
                                      'B1SRLyFzWJjeA0ywW41Qu1j7ZpBLHsXSSrWLrT3ebd8', /* kyve  */
                                      'cETTyJQYxJLVQ6nC3VxzsZf1x2-6TW2LFkGZa91gUWc', /* koi   */
                /*  'QA7AIFVx1KBBmzC7WUNhJbDsHlSJArUT0jWrhZMZPS8',  koi   */
                                      '8cq1wbjWHNiPg7GwYpoDT2m9HX99LY7tklRQWfh1L6c', /* kyve  */
                /*                     'NwaSMGCdz6Yu5vNjlMtCNBmfEkjYfT-dfYkbQQDGn5s', koi   */
                                      'qzVAzvhwr1JFTPE8lIU9ZG_fuihOmBr7ewZFcT3lIUc', /* koi   */
                                      'OFD4GqQcqp-Y_Iqh8DN_0s3a_68oMvvnekeOEu_a45I', /* kyve  */
                                      'CdPAQNONoR83Shj3CbI_9seC-LqgI1oLaRJhSwP90-o', /* koi   */
                                      'dNXaqE_eATp2SRvyFjydcIPHbsXAe9UT-Fktcqs7MDk' /* kyve  */
                )
            ORDER BY block_height ASC
            LIMIT ?;`,
        [MIN_CONFIRMATIONS, lastVerificationHeight, PARALLEL_REQUESTS]
      )
    ).rows;
  } catch (e: any) {
    logger.error('Error while fetching interactions', e.message);
    return;
  }

  if (interactionsToCheck === undefined || interactionsToCheck.length === 0) {
    logger.info('No new interactions to confirm.');
    // just in case - search for the non-confirmed interactions from the beginning in the next round
    lastVerificationHeight = 0;
    return;
  }

  const prevVerificationHeight = lastVerificationHeight;

  lastVerificationHeight = [...interactionsToCheck].pop()?.block_height || lastVerificationHeight;

  logger.debug(
    `Checking ${interactionsToCheck.length} interactions from height ${interactionsToCheck[0].block_height}.`
  );

  let statusesRounds: ConfirmationRoundResult[] = Array<ConfirmationRoundResult>(TX_CONFIRMATION_SUCCESSFUL_ROUNDS);
  let successfulRounds = 0;
  let rounds = 0;

  // we need to make sure that each interaction in each round will be checked by a different peer.
  // - that's why we keep the peers registry per interaction
  const interactionsPeers = new Map<string, { peer: string }[]>();
  interactionsToCheck.forEach((i) => {
    interactionsPeers.set(i.interaction_id, [...peers]);
  });

  // at some point we could probably generify the snowball and use it here to ask multiple peers.
  while (successfulRounds < TX_CONFIRMATION_SUCCESSFUL_ROUNDS && rounds < TX_CONFIRMATION_MAX_ROUNDS) {
    // too many rounds have already failed and there's no chance to get the minimal successful rounds...
    if (successfulRounds + TX_CONFIRMATION_MAX_ROUNDS - rounds < TX_CONFIRMATION_SUCCESSFUL_ROUNDS) {
      logger.warn("There's no point in trying, exiting..");
      lastVerificationHeight = prevVerificationHeight;
      return;
    }

    try {
      const roundResult: ConfirmationRoundResult = [];

      // checking status of each of the interaction by a randomly selected peer.
      // in each round each interaction will be checked by a different peer.
      const statuses = await Promise.race([
        new Promise<any[]>(function (resolve, reject) {
          setTimeout(
            () => reject('Status query timeout, better luck next time...'),
            TX_CONFIRMATION_MAX_ROUND_TIMEOUT_MS
          );
        }),

        Promise.allSettled(
          interactionsToCheck.map((tx) => {
            // const interactionPeers = interactionsPeers.get(tx.interaction_id)!;
            // const randomPeer = interactionPeers[Math.floor(Math.random() * interactionPeers.length)];

            // removing the selected peer for this interaction
            // - so it won't be selected again in any of the next rounds.
            // interactionPeers.splice(peers.indexOf(randomPeer), 1);
            // const randomPeerUrl = `http://${randomPeer.peer}`;

            // return axios.get(`${randomPeerUrl}/tx/${tx.interaction_id}/status`);
            return axios.get(`https://arweave.net/tx/${tx.interaction_id}/status`);
          })
        ),
      ]);

      // verifying responses from peers
      for (let i = 0; i < statuses.length; i++) {
        const statusResponse = statuses[i];
        const txId = interactionsToCheck[i].interaction_id;
        if (statusResponse.status === 'rejected') {
          // interaction is (probably) corrupted
          if (statusResponse.reason.response?.status === 404) {
            logger.warn(`Interaction ${txId} on ${statusResponse.reason.request.host} not found.`);
            roundResult.push({
              txId: txId,
              peer: statusResponse.reason.request.host,
              result: 'corrupted',
              confirmations: 0,
            });
          } else {
            // no proper response from peer (eg. 500)
            // TODO: consider blacklisting such peer (after returning error X times?) 'till next peersCheckLoop
            logger.error(
              `Query for ${txId} to ${statusResponse.reason?.request?.host} rejected. ${statusResponse.reason}.`
            );
            roundResult.push({
              txId: txId,
              peer: statusResponse.reason?.request?.host,
              result: 'error',
              confirmations: 0,
            });
          }
        } else {
          // transaction confirmed by given peer
          const confirmations = parseInt(statusResponse.value.data['number_of_confirmations']);
          logger.trace(`Confirmed ${txId} with ${confirmations}`);

          roundResult.push({
            txId: txId,
            peer: statusResponse.value.request.host,
            result: confirmations >= MIN_CONFIRMATIONS ? 'confirmed' : 'forked',
            confirmations: statusResponse.value.data['number_of_confirmations'],
          });
        }
      }
      statusesRounds[successfulRounds] = roundResult;
      successfulRounds++;
    } catch (e) {
      logger.error(e);
    } finally {
      rounds++;
    }
  }

  if (successfulRounds != TX_CONFIRMATION_SUCCESSFUL_ROUNDS) {
    logger.warn(
      `Transactions verification was not successful, successful rounds ${successfulRounds}, required successful rounds ${TX_CONFIRMATION_SUCCESSFUL_ROUNDS}`
    );
    lastVerificationHeight = prevVerificationHeight;
  } else {
    logger.info('Verifying rounds');

    // sanity check...whether all rounds have the same amount of interactions checked.
    for (let i = 0; i < statusesRounds.length; i++) {
      const r = statusesRounds[i];
      if (r.length !== interactionsToCheck.length) {
        logger.error(`Each round should have ${interactionsToCheck.length} results. Round ${i} has ${r.length}.`);
        lastVerificationHeight = prevVerificationHeight;
        return;
      }
    }

    // programming is just loops and if-s...
    // For each interaction we're verifying whether the result returned in each round is the same.
    // If it is the same for all rounds - we store the confirmation status in the db.
    // It it is not the same - we're logging the difference and move to the next interaction.
    for (let i = 0; i < interactionsToCheck.length; i++) {
      let status = null;
      let sameStatusOccurrence = 0;
      const confirmingPeers = [];
      const confirmations = [];

      for (let j = 0; j < TX_CONFIRMATION_SUCCESSFUL_ROUNDS; j++) {
        const newStatus = statusesRounds[j][i].result;
        if (status === null || newStatus === status) {
          status = newStatus;
          sameStatusOccurrence++;
          confirmingPeers.push(statusesRounds[j][i].peer);
          confirmations.push(statusesRounds[j][i].confirmations);
        } else {
          logger.warn('Different response from peers for', {
            current_peer: statusesRounds[j][i],
            // note: j - 1 is safe here, because in this branch j >= 1
            // - if the status is different, than it means we're checking at least
            // second round for the given transaction
            prev_peer: statusesRounds[j - 1][i],
          });
          break;
        }
      }

      if (sameStatusOccurrence === TX_CONFIRMATION_SUCCESSFUL_ROUNDS) {
        // sanity check...
        if (status === null) {
          logger.error('WTF? Status should not be null!');
          continue;
        }
        try {
          logger.trace('Updating confirmation status in db');
          await dbSource.updateInteractionConfirmationStatus(
            interactionsToCheck[i].interaction_id,
            status,
            confirmingPeers,
            confirmations
          );
        } catch (e) {
          logger.error(e);
          lastVerificationHeight = prevVerificationHeight;
        }
      }
    }
  }

  logger.info('Transactions confirmation done.');
}
