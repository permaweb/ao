/* eslint-disable */
import Arweave from 'arweave';
import {
  ArweaveGatewayBundledContractDefinitionLoader,
  ArweaveGatewayBundledInteractionLoader,
  defaultCacheOptions,
  WarpFactory
} from '../src';

const arweave = Arweave.init({
  host: 'arweave.net',
  port: 443,
  protocol: 'https',
  timeout: 200000
});

const arContractLoader = new ArweaveGatewayBundledContractDefinitionLoader('mainnet');
const arInteractionLoader = new ArweaveGatewayBundledInteractionLoader(arweave, 'mainnet');
const contractId = 'TlqASNDLA1Uh8yFiH-BzR_1FDag4s735F3PoUFEv2Mo';
const warp = WarpFactory.custom(
  arweave,
  {
    ...defaultCacheOptions,
    inMemory: true
  },
  'mainnet'
)
  .useArweaveGateway()
  .setInteractionsLoader(arInteractionLoader)
  .setDefinitionLoader(arContractLoader)
  .build();

const c = warp.contract(contractId).setEvaluationOptions({
  allowBigInt: true,
  unsafeClient: 'skip'
});

async function getState() {
  try {
    const { sortKey, cachedValue } = await c.readState();
    console.log(sortKey, cachedValue.errorMessages, cachedValue.state, cachedValue.validity);
  } catch (error) {
    console.log('readState error:', error, 'contractId:', contractId);
  }
}

getState();
