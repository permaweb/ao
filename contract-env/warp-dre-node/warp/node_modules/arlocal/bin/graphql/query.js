"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBlockQuery = exports.blockOrderByClauses = exports.generateQuery = exports.tagOrderByClauses = exports.orderByClauses = void 0;
exports.orderByClauses = {
    HEIGHT_ASC: 'transactions.height ASC',
    HEIGHT_DESC: 'transactions.height DESC',
};
exports.tagOrderByClauses = {
    HEIGHT_ASC: 'tags.created_at ASC',
    HEIGHT_DESC: 'tags.created_at DESC',
};
function generateQuery(params, connection) {
    return __awaiter(this, void 0, void 0, function* () {
        const { to, from, tags, id, ids, status = 'confirmed', select } = params;
        const { limit = 10, blocks = false, sortOrder } = params;
        const { offset = 0, minHeight = -1, maxHeight = -1 } = params;
        const query = connection
            .queryBuilder()
            .select(select || { id: 'transactions.id', height: 'transactions.height', tags: 'transactions.tags' })
            .from('transactions');
        if (id) {
            query.where('transactions.id', id);
        }
        if (ids) {
            query.whereIn('transactions.id', ids);
        }
        if (blocks) {
            query.leftJoin('blocks', 'transactions.height', 'blocks.height');
        }
        if (status === 'confirmed') {
            query.whereNotNull('transactions.height');
        }
        if (to) {
            query.whereIn('transactions.target', to);
        }
        if (from) {
            query.whereIn('transactions.owner_address', from);
        }
        if (tags) {
            tags.forEach((tag, index) => {
                const tagAlias = `${index}_${index}`;
                query.join(`tags as ${tagAlias}`, (join) => {
                    join.on('transactions.id', `${tagAlias}.tx_id`);
                    join.andOnIn(`${tagAlias}.name`, [tag.name]);
                    if (tag.op === 'EQ') {
                        join.andOnIn(`${tagAlias}.value`, tag.values);
                    }
                    if (tag.op === 'NEQ') {
                        join.andOnNotIn(`${tagAlias}.value`, tag.values);
                    }
                });
            });
        }
        if (minHeight >= 0) {
            query.where('transactions.height', '>=', minHeight);
        }
        if (maxHeight >= 0) {
            query.where('transactions.height', '<=', maxHeight);
        }
        query.limit(limit).offset(offset);
        if (Object.keys(exports.orderByClauses).includes(sortOrder)) {
            query.orderByRaw(exports.orderByClauses[sortOrder]);
        }
        else {
            query.orderByRaw(`transactions.created_at DESC`);
        }
        return query;
    });
}
exports.generateQuery = generateQuery;
exports.blockOrderByClauses = {
    HEIGHT_ASC: 'blocks.height ASC NULLS LAST, id ASC',
    HEIGHT_DESC: 'blocks.height DESC NULLS FIRST, id ASC',
};
function generateBlockQuery(params, connection) {
    return __awaiter(this, void 0, void 0, function* () {
        const { id, ids, limit = 10, offset = 0, select, before, sortOrder, minHeight, maxHeight } = params;
        const query = connection.queryBuilder().select(select).from('blocks');
        if (id) {
            query.where('blocks.id', id);
        }
        if (ids === null || ids === void 0 ? void 0 : ids.length) {
            query.whereIn('blocks.id', ids);
        }
        if (before) {
            query.where('blocks.created_at', '<', before);
        }
        if (minHeight && minHeight >= 0) {
            query.where('blocks.height', '>=', minHeight);
        }
        if (maxHeight && maxHeight >= 0) {
            query.where('blocks.height', '<=', maxHeight);
        }
        query.limit(limit).offset(offset);
        if (sortOrder) {
            if (Object.keys(exports.blockOrderByClauses).includes(sortOrder)) {
                query.orderByRaw(exports.blockOrderByClauses[sortOrder]);
            }
        }
        return query;
    });
}
exports.generateBlockQuery = generateBlockQuery;
//# sourceMappingURL=query.js.map