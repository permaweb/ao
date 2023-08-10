"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagOperator = exports.SortOrder = void 0;
/** Optionally reverse the result sort order from `HEIGHT_DESC` (default) to `HEIGHT_ASC`. */
var SortOrder;
(function (SortOrder) {
    /** Results are sorted by the transaction block height in ascending order, with the oldest transactions appearing first, and the most recent and pending/unconfirmed appearing last. */
    SortOrder["HeightAsc"] = "HEIGHT_ASC";
    /** Results are sorted by the transaction block height in descending order, with the most recent and unconfirmed/pending transactions appearing first. */
    SortOrder["HeightDesc"] = "HEIGHT_DESC";
})(SortOrder = exports.SortOrder || (exports.SortOrder = {}));
/** The operator to apply to a tag value. */
var TagOperator;
(function (TagOperator) {
    /** Equal */
    TagOperator["Eq"] = "EQ";
    /** Not equal */
    TagOperator["Neq"] = "NEQ";
})(TagOperator = exports.TagOperator || (exports.TagOperator = {}));
//# sourceMappingURL=types.js.map