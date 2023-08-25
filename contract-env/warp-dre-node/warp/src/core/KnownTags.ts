type ObjectValues<T> = T[keyof T];
/**
 * Definition of all transaction tags used by the SmartWeave "protocol"
 */
export const SMART_WEAVE_TAGS = {
  APP_NAME: 'App-Name',
  APP_VERSION: 'App-Version',
  CONTRACT_TX_ID: 'Contract', // note: should be named Contract-Tx-Id
  INPUT: 'Input',
  CONTENT_TYPE: 'Content-Type',
  CONTRACT_SRC_TX_ID: 'Contract-Src', // note: should be named Contract-Src-Tx-Id
  SDK: 'SDK',
  MIN_FEE: 'Min-Fee'
} as const;
export type SmartWeaveTags = ObjectValues<typeof SMART_WEAVE_TAGS>;

/**
 * Definition of all transaction tags specific to Warp platform
 */
export const WARP_TAGS = {
  SEQUENCER: 'Sequencer',
  SEQUENCER_OWNER: 'Sequencer-Owner',
  SEQUENCER_MILLIS: 'Sequencer-Mills',
  SEQUENCER_SORT_KEY: 'Sequencer-Sort-Key',
  SEQUENCER_PREV_SORT_KEY: 'Sequencer-Prev-Sort-Key',
  SEQUENCER_LAST_SORT_KEY: 'Sequencer-Last-Sort-Key', // deprecated
  SEQUENCER_TX_ID: 'Sequencer-Tx-Id',
  SEQUENCER_BLOCK_HEIGHT: 'Sequencer-Block-Height',
  SEQUENCER_BLOCK_ID: 'Sequencer-Block-Id',
  SEQUENCER_BLOCK_TIMESTAMP: 'Sequencer-Block-Timestamp',
  INIT_STATE: 'Init-State',
  INIT_STATE_TX: 'Init-State-TX',
  INTERACT_WRITE: 'Interact-Write',
  WASM_LANG: 'Wasm-Lang',
  WASM_LANG_VERSION: 'Wasm-Lang-Version',
  WASM_META: 'Wasm-Meta',
  REQUEST_VRF: 'Request-Vrf',
  SIGNATURE_TYPE: 'Signature-Type',
  WARP_TESTNET: 'Warp-Testnet',
  MANIFEST: 'Contract-Manifest',
  NONCE: 'Nonce'
} as const;

export type WarpTags = ObjectValues<typeof WARP_TAGS>;
