"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WARP_TAGS = exports.SMART_WEAVE_TAGS = void 0;
/**
 * Definition of all transaction tags used by the SmartWeave "protocol"
 */
exports.SMART_WEAVE_TAGS = {
    APP_NAME: 'App-Name',
    APP_VERSION: 'App-Version',
    CONTRACT_TX_ID: 'Contract',
    INPUT: 'Input',
    CONTENT_TYPE: 'Content-Type',
    CONTRACT_SRC_TX_ID: 'Contract-Src',
    SDK: 'SDK',
    MIN_FEE: 'Min-Fee'
};
/**
 * Definition of all transaction tags specific to Warp platform
 */
exports.WARP_TAGS = {
    SEQUENCER: 'Sequencer',
    SEQUENCER_OWNER: 'Sequencer-Owner',
    SEQUENCER_MILLIS: 'Sequencer-Mills',
    SEQUENCER_SORT_KEY: 'Sequencer-Sort-Key',
    SEQUENCER_PREV_SORT_KEY: 'Sequencer-Prev-Sort-Key',
    SEQUENCER_LAST_SORT_KEY: 'Sequencer-Last-Sort-Key',
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
};
//# sourceMappingURL=KnownTags.js.map