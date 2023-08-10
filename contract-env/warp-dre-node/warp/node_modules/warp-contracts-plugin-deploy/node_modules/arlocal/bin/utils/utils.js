"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.concatBuffers = exports.groupBy = exports.Utils = void 0;
const encoding_1 = require("./encoding");
const buffer_1 = require("./buffer");
Object.defineProperty(exports, "concatBuffers", { enumerable: true, get: function () { return buffer_1.concatBuffers; } });
class Utils {
    static randomID(len) {
        // tslint:disable-next-line: no-bitwise
        return [...Array(len || 43)].map(() => (~~(Math.random() * 36)).toString(36)).join('');
    }
    static atob(a) {
        return Buffer.from(a, 'base64').toString('binary');
    }
    static btoa(b) {
        return Buffer.from(b).toString('base64');
    }
    static tagValue(tags, name) {
        for (const tag of tags) {
            if ((0, encoding_1.fromB64Url)(tag.name).toString().toLowerCase() === name.toLowerCase()) {
                return (0, encoding_1.fromB64Url)(tag.value).toString();
            }
        }
        return '';
    }
}
exports.Utils = Utils;
const groupBy = (obj, key) => {
    return obj.reduce((rv, x) => {
        (rv[x[key]] = rv[x[key]] || []).push(x);
        return rv;
    }, {});
};
exports.groupBy = groupBy;
//# sourceMappingURL=utils.js.map