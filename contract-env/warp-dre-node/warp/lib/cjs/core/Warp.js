"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Warp = void 0;
const HandlerBasedContract_1 = require("../contract/HandlerBasedContract");
const PstContractImpl_1 = require("../contract/PstContractImpl");
const Testing_1 = require("../contract/testing/Testing");
const WarpBuilder_1 = require("./WarpBuilder");
const WarpPlugin_1 = require("./WarpPlugin");
const WarpFactory_1 = require("./WarpFactory");
const LevelDbCache_1 = require("../cache/impl/LevelDbCache");
/**
 * The Warp "motherboard" ;-).
 * This is the base class that supplies the implementation of the SmartWeave protocol
 * Allows to plug-in different implementation of all the modules defined in the constructor.
 *
 * After being fully configured, it allows to "connect" to
 * contract and perform operations on them (see {@link Contract})
 */
class Warp {
    get createContract() {
        if (!this._createContract) {
            if (this.plugins.has('deploy')) {
                const deployPlugin = this.loadPlugin('deploy');
                this._createContract = deployPlugin.process(this);
            }
            else {
                throw new Error(`In order to use CreateContract methods please attach DeployPlugin.`);
            }
        }
        return this._createContract;
    }
    constructor(arweave, definitionLoader, interactionsLoader, executorFactory, stateEvaluator, environment = 'custom') {
        this.arweave = arweave;
        this.definitionLoader = definitionLoader;
        this.interactionsLoader = interactionsLoader;
        this.executorFactory = executorFactory;
        this.stateEvaluator = stateEvaluator;
        this.environment = environment;
        this._gwUrl = WarpFactory_1.WARP_GW_URL;
        this.plugins = new Map();
        this.testing = new Testing_1.Testing(arweave);
        this.kvStorageFactory = (contractTxId) => {
            return new LevelDbCache_1.LevelDbCache({
                inMemory: false,
                dbLocation: `${WarpFactory_1.DEFAULT_LEVEL_DB_LOCATION}/kv/ldb/${contractTxId}`
            });
        };
    }
    static builder(arweave, stateCache, environment) {
        return new WarpBuilder_1.WarpBuilder(arweave, stateCache, environment);
    }
    /**
     * Allows to connect to any contract using its transaction id.
     * @param contractTxId
     * @param callingContract
     */
    contract(contractTxId, callingContract, innerCallData) {
        return new HandlerBasedContract_1.HandlerBasedContract(contractTxId, this, callingContract, innerCallData);
    }
    async deploy(contractData, disableBundling) {
        return await this.createContract.deploy(contractData, disableBundling);
    }
    async deployFromSourceTx(contractData, disableBundling) {
        return await this.createContract.deployFromSourceTx(contractData, disableBundling);
    }
    async deployBundled(rawDataItem) {
        return await this.createContract.deployBundled(rawDataItem);
    }
    async register(id, bundlrNode) {
        return await this.createContract.register(id, bundlrNode);
    }
    async createSource(sourceData, wallet, disableBundling = false) {
        return await this.createContract.createSource(sourceData, wallet, disableBundling);
    }
    async saveSource(src, disableBundling) {
        return await this.createContract.saveSource(src, disableBundling);
    }
    /**
     * Allows to connect to a contract that conforms to the Profit Sharing Token standard
     * @param contractTxId
     */
    pst(contractTxId) {
        return new PstContractImpl_1.PstContractImpl(contractTxId, this);
    }
    useStateCache(stateCache) {
        this.stateEvaluator.setCache(stateCache);
        return this;
    }
    useContractCache(definition, src) {
        this.definitionLoader.setSrcCache(src);
        this.definitionLoader.setCache(definition);
        return this;
    }
    use(plugin) {
        const pluginType = plugin.type();
        if (!this.isPluginType(pluginType)) {
            throw new Error(`Unknown plugin type ${pluginType}.`);
        }
        this.plugins.set(pluginType, plugin);
        return this;
    }
    hasPlugin(type) {
        return this.plugins.has(type);
    }
    matchPlugins(type) {
        const pluginTypes = [...this.plugins.keys()];
        return pluginTypes.filter((p) => p.match(type));
    }
    loadPlugin(type) {
        if (!this.hasPlugin(type)) {
            throw new Error(`Plugin ${type} not registered.`);
        }
        return this.plugins.get(type);
    }
    maybeLoadPlugin(type) {
        if (!this.hasPlugin(type)) {
            return null;
        }
        return this.plugins.get(type);
    }
    // Close cache connection
    async close() {
        return Promise.all([
            this.definitionLoader.getSrcCache().close(),
            this.definitionLoader.getCache().close(),
            this.stateEvaluator.getCache().close()
        ]).then();
    }
    async generateWallet() {
        const wallet = await this.arweave.wallets.generate();
        if (await this.testing.isArlocal()) {
            await this.testing.addFunds(wallet);
        }
        return {
            jwk: wallet,
            address: await this.arweave.wallets.jwkToAddress(wallet)
        };
    }
    isPluginType(value) {
        return (WarpPlugin_1.knownWarpPlugins.includes(value) || WarpPlugin_1.knownWarpPluginsPartial.some((p) => value.match(p)));
    }
    useKVStorageFactory(factory) {
        this.kvStorageFactory = factory;
        return this;
    }
    useGwUrl(url) {
        this._gwUrl = url;
        return this;
    }
    gwUrl() {
        return this._gwUrl;
    }
}
exports.Warp = Warp;
//# sourceMappingURL=Warp.js.map