import { PeerList } from 'arweave/node/network';
import { Benchmark } from 'warp-contracts';
import axios from 'axios';
import { TaskRunner } from './TaskRunner';
import { GatewayContext } from '../init';
import { PeerInsert } from '../../db/insertInterfaces';

const MAX_ARWEAVE_PEER_INFO_TIMEOUT_MS = 3000;
const PEERS_CHECK_INTERVAL_MS = 1000 * 60 * 60;

export async function runLoadPeersTask(context: GatewayContext) {
  const { logger, dbSource } = context;
  const currentPeers: { peer: string }[] = await dbSource.raw(`SELECT peer from peers;`);
  if (currentPeers.length < 200) {
    logger.info('Pre-loading peers...');
    await loadPeers(context);
  }

  await TaskRunner.from('[load peers]', loadPeers, context).runAsyncEvery(PEERS_CHECK_INTERVAL_MS, false);
}

async function loadPeers(context: GatewayContext) {
  const { logger, arweave, dbSource } = context;

  logger.info('Updating peers...');

  const newPeers: PeerList = await arweave.network.getPeers();
  const currentPeers: { peer: string }[] = await dbSource.raw(`SELECT peer FROM peers;`);

  const peersToRemove: string[] = [];
  currentPeers.forEach((currentPeer) => {
    if (!newPeers.find((peer) => currentPeer.peer === peer)) {
      peersToRemove.push(currentPeer.peer);
    }
  });

  logger.debug('Removing no longer available peers', peersToRemove);

  const removedCount = await dbSource.deletePeers(peersToRemove);

  logger.debug(`Removed ${removedCount} elements.`);

  for (const peer of newPeers) {
    logger.debug(`Checking Arweave peer ${peer} [${newPeers.indexOf(peer) + 1} / ${newPeers.length}]`);
    try {
      const benchmark = Benchmark.measure();
      const result = await axios.get(`http://${peer}/info`, {
        timeout: MAX_ARWEAVE_PEER_INFO_TIMEOUT_MS,
      });
      const elapsed = benchmark.elapsed(true);

      const peerInsert: PeerInsert = {
        peer: peer,
        blocks: result.data.blocks,
        height: result.data.height,
        response_time: elapsed,
        blacklisted: false,
      };

      await dbSource.insertPeer(peerInsert);
    } catch (e: any) {
      logger.error(`Error from ${peer}`, e.message);
      await dbSource.insertPeerEror(peer);
    }
  }
}
