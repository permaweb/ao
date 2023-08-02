import { GQLTagInterface, Tags } from 'warp-contracts';
import { WarpDeployment } from '../gateway/router/routes/deployContractRoute';

export interface SequencerInsert {
  original_sig: string;
  original_owner: string;
  original_address: string;
  sequence_block_id: string;
  sequence_block_height: string;
  sequence_transaction_id: string;
  sequence_millis: string;
  sequence_sort_key: string;
  bundler_tx_id: string;
  bundler_response: string;
  last_sort_key: string;
}

export interface InteractionInsert {
  interaction_id: string;
  interaction: string;
  block_height: number;
  block_timestamp: number;
  block_id: string;
  contract_id: string;
  function: string;
  input: string;
  confirmation_status: string;
  confirming_peer?: string;
  source?: string;
  bundler_tx_id?: string;
  interact_write: string | string[];
  sort_key: string;
  evolve: string | null;
  testnet: string | null;
  last_sort_key?: string | null;
  owner: string;
  sync_timestamp: number;
}

export interface ContractInsert {
  contract_id: string;
  src_tx_id: string;
  init_state: string;
  owner: string | undefined;
  type: string;
  pst_ticker: string;
  pst_name: string;
  block_height: number;
  block_timestamp: number;
  content_type: string | undefined;
  contract_tx: {
    tags: Tags;
  };
  bundler_contract_tx_id: string;
  bundler_contract_node: string;
  testnet: string | null;
  deployment_type: WarpDeployment | 'arweave';
  manifest: string;
  sync_timestamp: number;
}

export interface ContractSourceInsert {
  src_tx_id?: string | undefined;
  owner?: string | undefined;
  src: string | null | undefined;
  src_content_type: string | undefined;
  src_binary: Buffer | null;
  src_wasm_lang: string | null;
  bundler_src_node: string;
  src_tx: any;
  testnet: string | null | GQLTagInterface;
  deployment_type: WarpDeployment | string;
  bundler_response: string | null;
  bundler_src_tx_id: string;
}

export type INTERACTIONS_TABLE = {
  interaction_id: string;
  interaction: string;
  block_height: number;
  block_timestamp: number;
  block_id: string;
  contract_id: string;
  function: string;
  input: string;
  confirmation_status: string;
  interact_write: string[];
  sort_key: string;
  evolve: string | null;
  testnet: string | null;
  owner: string;
};

export interface PeerInsert {
  peer: string;
  blocks: any;
  height: any;
  response_time: string | number;
  blacklisted: boolean;
}
