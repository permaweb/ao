"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagToB64 = exports.tagToUTF8 = exports.tagValue = exports.toB64url = void 0;
const encoding_1 = require("../utils/encoding");
function toB64url(input) {
    return Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
exports.toB64url = toB64url;
function tagValue(tags, name) {
    for (const tag of tags) {
        if ((0, encoding_1.fromB64Url)(tag.name).toString().toLowerCase() === name.toLowerCase()) {
            return (0, encoding_1.fromB64Url)(tag.value).toString();
        }
    }
    return '';
}
exports.tagValue = tagValue;
function tagToUTF8(tags) {
    const conversion = [];
    for (const tag of tags) {
        conversion.push({
            name: (0, encoding_1.fromB64Url)(tag.name).toString(),
            value: (0, encoding_1.fromB64Url)(tag.value).toString(),
        });
    }
    return conversion;
}
exports.tagToUTF8 = tagToUTF8;
function tagToB64(tags) {
    const conversion = [];
    for (const tag of tags) {
        conversion.push({
            name: toB64url(tag.name),
            values: tag.values.map((v) => toB64url(v)),
        });
    }
    return conversion;
}
exports.tagToB64 = tagToB64;
//# sourceMappingURL=transaction.js.map