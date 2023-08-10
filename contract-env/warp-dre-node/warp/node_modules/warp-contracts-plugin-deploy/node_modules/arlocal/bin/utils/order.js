"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagOrder = exports.transactionOrder = exports.blockOrder = exports.indices = void 0;
exports.indices = JSON.parse(process.env.INDICES || '[]');
exports.blockOrder = ['id', 'previous_block', 'mined_at', 'height', 'txs', 'extended'];
exports.transactionOrder = [
    'format',
    'id',
    'signature',
    'owner',
    'owner_address',
    'target',
    'reward',
    'last_tx',
    'height',
    'tags',
    'quantity',
    'content_type',
    'data_size',
    'data_root',
];
exports.tagOrder = ['tx_id', 'index', 'name', 'value'];
//# sourceMappingURL=order.js.map