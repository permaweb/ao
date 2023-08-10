type ObjectValues<T> = T[keyof T];
/**
 * Definition of all transaction tags used by the SmartWeave "protocol"
 */
export declare const SMART_WEAVE_TAGS: {
    readonly APP_NAME: "App-Name";
    readonly APP_VERSION: "App-Version";
    readonly CONTRACT_TX_ID: "Contract";
    readonly INPUT: "Input";
    readonly CONTENT_TYPE: "Content-Type";
    readonly CONTRACT_SRC_TX_ID: "Contract-Src";
    readonly SDK: "SDK";
    readonly MIN_FEE: "Min-Fee";
};
export type SmartWeaveTags = ObjectValues<typeof SMART_WEAVE_TAGS>;
/**
 * Definition of all transaction tags specific to Warp platform
 */
export declare const WARP_TAGS: {
    readonly SEQUENCER: "Sequencer";
    readonly SEQUENCER_OWNER: "Sequencer-Owner";
    readonly SEQUENCER_MILLIS: "Sequencer-Mills";
    readonly SEQUENCER_SORT_KEY: "Sequencer-Sort-Key";
    readonly SEQUENCER_PREV_SORT_KEY: "Sequencer-Prev-Sort-Key";
    readonly SEQUENCER_LAST_SORT_KEY: "Sequencer-Last-Sort-Key";
    readonly SEQUENCER_TX_ID: "Sequencer-Tx-Id";
    readonly SEQUENCER_BLOCK_HEIGHT: "Sequencer-Block-Height";
    readonly SEQUENCER_BLOCK_ID: "Sequencer-Block-Id";
    readonly SEQUENCER_BLOCK_TIMESTAMP: "Sequencer-Block-Timestamp";
    readonly INIT_STATE: "Init-State";
    readonly INIT_STATE_TX: "Init-State-TX";
    readonly INTERACT_WRITE: "Interact-Write";
    readonly WASM_LANG: "Wasm-Lang";
    readonly WASM_LANG_VERSION: "Wasm-Lang-Version";
    readonly WASM_META: "Wasm-Meta";
    readonly REQUEST_VRF: "Request-Vrf";
    readonly SIGNATURE_TYPE: "Signature-Type";
    readonly WARP_TESTNET: "Warp-Testnet";
    readonly MANIFEST: "Contract-Manifest";
    readonly NONCE: "Nonce";
};
export type WarpTags = ObjectValues<typeof WARP_TAGS>;
export {};
//# sourceMappingURL=KnownTags.d.ts.map