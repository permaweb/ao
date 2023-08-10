"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArweaveWrapper = void 0;
const arweave_1 = __importDefault(require("arweave"));
const warp_isomorphic_1 = require("warp-isomorphic");
const LoggerFactory_1 = require("../logging/LoggerFactory");
const arweave_types_1 = require("./types/arweave-types");
const utils_1 = require("./utils");
class ArweaveWrapper {
    constructor(warp) {
        this.warp = warp;
        this.logger = LoggerFactory_1.LoggerFactory.INST.create('ArweaveWrapper');
        const { arweave } = warp;
        this.baseUrl = `${arweave.api.config.protocol}://${arweave.api.config.host}:${arweave.api.config.port}`;
        this.logger.debug('baseurl', this.baseUrl);
    }
    async warpGwInfo() {
        return await this.doFetchInfo(`${(0, utils_1.stripTrailingSlash)(this.warp.gwUrl())}/gateway/arweave/info`);
    }
    async warpGwBlock() {
        this.logger.debug('Calling warp gw block info');
        return await this.doFetchInfo(`${(0, utils_1.stripTrailingSlash)(this.warp.gwUrl())}/gateway/arweave/block`);
    }
    async info() {
        return await this.doFetchInfo(`${this.baseUrl}/info`);
    }
    /**
     *
     * @param query graphql query string
     * @param variables variables depends on provided query
     * @returns axios-like (for backwards compatibility..) response from graphql
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async gql(query, variables) {
        try {
            const data = JSON.stringify({
                query: query,
                variables: variables
            });
            const response = await (0, utils_1.getJsonResponse)(fetch(`${this.baseUrl}/graphql`, {
                method: 'POST',
                body: data,
                headers: {
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Content-Type': 'application/json',
                    Accept: 'application/json'
                }
            }));
            return {
                data: response,
                status: 200
            };
        }
        catch (e) {
            this.logger.error('Error while loading gql', e);
            throw e;
        }
    }
    async tx(id) {
        const response = await fetch(`${this.baseUrl}/tx/${id}`)
            .then((res) => {
            return res.ok ? res.json() : Promise.reject(res);
        })
            .catch((error) => {
            var _a, _b;
            if ((_a = error.body) === null || _a === void 0 ? void 0 : _a.message) {
                this.logger.error(error.body.message);
            }
            throw new Error(`Unable to retrieve tx ${id}. ${error.status}. ${(_b = error.body) === null || _b === void 0 ? void 0 : _b.message}`);
        });
        return new arweave_types_1.Transaction({
            ...response
        });
    }
    async txData(id) {
        // note: this is using arweave.net cache -
        // not very safe and clever, but fast...
        const response = await fetch(`${this.baseUrl}/${id}`);
        if (!response.ok) {
            this.logger.warn(`Unable to load data from arweave.net/${id} endpoint, falling back to arweave.js`);
            // fallback to arweave-js as a last resort..
            const txData = (await this.warp.arweave.transactions.getData(id, {
                decode: true
            }));
            return warp_isomorphic_1.Buffer.from(txData);
        }
        else {
            const buffer = await response.arrayBuffer();
            return warp_isomorphic_1.Buffer.from(buffer);
        }
    }
    async txDataString(id) {
        const buffer = await this.txData(id);
        return arweave_1.default.utils.bufferToString(buffer);
    }
    async doFetchInfo(url) {
        return await (0, utils_1.getJsonResponse)(fetch(url));
    }
}
exports.ArweaveWrapper = ArweaveWrapper;
//# sourceMappingURL=ArweaveWrapper.js.map