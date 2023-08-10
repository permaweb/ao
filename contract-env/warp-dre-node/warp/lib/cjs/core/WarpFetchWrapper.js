"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WarpFetchWrapper = void 0;
const LoggerFactory_1 = require("../logging/LoggerFactory");
class WarpFetchWrapper {
    constructor(warp) {
        this.warp = warp;
        this.name = 'WarpFetchWrapper';
        this.logger = LoggerFactory_1.LoggerFactory.INST.create(this.name);
        this.warp = warp;
    }
    fetch(input, init) {
        let fetchOptions;
        if (this.warp.hasPlugin('fetch-options')) {
            const fetchOptionsPlugin = this.warp.loadPlugin('fetch-options');
            try {
                const updatedFetchOptions = fetchOptionsPlugin.process({ input, init: init || {} });
                fetchOptions = { ...init, ...updatedFetchOptions };
            }
            catch (e) {
                if (e.message) {
                    this.logger.error(e.message);
                }
                throw new Error(`Unable to process fetch options: ${e.message}`);
            }
        }
        else {
            fetchOptions = init;
        }
        return fetch(input, fetchOptions);
    }
}
exports.WarpFetchWrapper = WarpFetchWrapper;
//# sourceMappingURL=WarpFetchWrapper.js.map