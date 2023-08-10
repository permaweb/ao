"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Signature = void 0;
const warp_arbundles_1 = require("warp-arbundles");
class Signature {
    constructor(warp, walletOrSignature) {
        this.warp = warp;
        if (this.isCustomSignature(walletOrSignature)) {
            this.assertEnvForCustomSigner(walletOrSignature.type);
            this.signer = walletOrSignature.signer;
            this.type = walletOrSignature.type;
            this.signatureProviderType = 'CustomSignature';
        }
        else if (this.isValidBundlerSignature(walletOrSignature)) {
            this.signatureProviderType = 'BundlerSigner';
            this.type = decodeBundleSignatureType(walletOrSignature.signatureType);
            this.bundlerSigner = walletOrSignature;
        }
        else {
            this.assignArweaveSigner(walletOrSignature);
            this.bundlerSigner =
                typeof walletOrSignature == 'string' ? null : new warp_arbundles_1.ArweaveSigner(walletOrSignature);
            this.signatureProviderType = 'ArWallet';
            this.type = 'arweave';
        }
        this.wallet = walletOrSignature;
    }
    async getAddress() {
        if (this.cachedAddress) {
            return this.cachedAddress;
        }
        switch (this.signatureProviderType) {
            case 'CustomSignature': {
                if (this.wallet.getAddress) {
                    this.cachedAddress = await this.wallet.getAddress();
                }
                else {
                    this.cachedAddress = await this.deduceSignerBySigning();
                }
                return this.cachedAddress;
            }
            case 'ArWallet': {
                this.cachedAddress = await this.deduceSignerBySigning();
                return this.cachedAddress;
            }
            case 'BundlerSigner': {
                // If we can parse publicKey to `signatureType` address, we don't have to call it
                this.cachedAddress = await this.deduceSignerBySigning();
                return this.cachedAddress;
            }
            default:
                throw Error('Unknown Signature::signatureProvider : ' + this.signatureProviderType);
        }
    }
    async deduceSignerBySigning() {
        const { arweave } = this.warp;
        if (this.signatureProviderType == 'BundlerSigner') {
            try {
                return await this.bundlerSigner.getAddress();
            }
            catch (e) {
                throw new Error(`Could not get address from the signer. Is the 'getAddress' implementation correct?'`);
            }
        }
        else if (this.signatureProviderType == 'ArWallet' || this.signatureProviderType == 'CustomSignature') {
            const dummyTx = await arweave.createTransaction({
                data: Math.random().toString().slice(-4),
                reward: '72600854',
                last_tx: 'p7vc1iSP6bvH_fCeUFa9LqoV5qiyW-jdEKouAT0XMoSwrNraB9mgpi29Q10waEpO'
            });
            await this.signer(dummyTx);
            return arweave.wallets.ownerToAddress(dummyTx.owner);
        }
        else {
            throw Error('Unknown Signature::type');
        }
    }
    checkNonArweaveSigningAvailability(bundling) {
        if (this.type !== 'arweave' && !bundling) {
            throw new Error(`Unable to use signing function of type: ${this.type} when bundling is disabled.`);
        }
    }
    checkBundlerSignerAvailability(bundling) {
        if ((!bundling || this.warp.environment == 'local') && this.signatureProviderType == 'BundlerSigner') {
            throw new Error(`Only wallet of type 'ArWallet' or 'CustomSignature' is allowed when bundling is disabled or in local environment.`);
        }
    }
    assignArweaveSigner(walletOrSignature) {
        this.signer = async (tx) => {
            await this.warp.arweave.transactions.sign(tx, walletOrSignature);
        };
    }
    assertEnvForCustomSigner(signatureType) {
        if (this.warp.interactionsLoader.type() === 'warp') {
            throw new Error(`Unable to use signing function when bundling is enabled.`);
        }
        if (signatureType == 'ethereum') {
            throw new Error(`Unable to use signing function with signature of type: ${signatureType}.`);
        }
    }
    isCustomSignature(signature) {
        return signature.signer !== undefined && signature.type !== undefined;
    }
    isValidBundlerSignature(signature) {
        const bundlerSignature = signature;
        // "If it looks like a duck, swims like a duck, and quacks like a duck, then it probably is a duck"
        const isBundlerSignature = !!bundlerSignature.signatureType && !!bundlerSignature.ownerLength && !!bundlerSignature.signatureLength;
        if (isBundlerSignature && !bundlerSignature.publicKey) {
            throw new Error(`It seems that you are using BundlerSigner, but publicKey is not set! Maybe try calling await bundlerSigner.setPublicKey() before using it.`);
        }
        return isBundlerSignature;
    }
}
exports.Signature = Signature;
function decodeBundleSignatureType(bundlerSignatureType) {
    // enum: https://github.com/Bundlr-Network/arbundles/blob/9fafdbfec6fbfcbcb538b92ae9bd0d9fbe413fb8/src/constants.ts#L1
    if (bundlerSignatureType === 3) {
        return 'ethereum';
    }
    else if (bundlerSignatureType === 1) {
        return 'arweave';
    }
    else {
        throw Error(`Not supported arbundle SignatureType : ${bundlerSignatureType}`);
    }
}
//# sourceMappingURL=Signature.js.map