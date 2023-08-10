import { Warp } from '../core/Warp';
import { ArWallet } from './deploy/CreateContract';
import { Transaction } from '../utils/types/arweave-types';
import { Signer as BundlerSigner } from 'warp-arbundles';
export type SignatureType = 'arweave' | 'ethereum';
export type SigningFunction = (tx: Transaction) => Promise<void>;
export type CustomSignature = {
    signer: SigningFunction;
    type: SignatureType;
    getAddress?: () => Promise<string>;
};
/**
Different types which can be used to sign transaction or data item
- ArWallet - default option for signing Arweave transactions, either JWKInterface or 'use_wallet'
- CustomSignature - object with `signer` field - a custom signing function which takes transaction as a parameter and requires signing it
  on the client side and `type` field of type SignatureType which indicates the wallet's chain, either 'arweave' or 'ethereum'
- Signer - arbundles specific class which allows to sign data items (works with data items - when bundling is enabled)
*/
export type SignatureProvider = ArWallet | CustomSignature | BundlerSigner;
export declare class Signature {
    signer: SigningFunction;
    bundlerSigner: BundlerSigner;
    readonly type: SignatureType;
    readonly warp: Warp;
    private readonly signatureProviderType;
    private readonly wallet;
    private cachedAddress?;
    constructor(warp: Warp, walletOrSignature: SignatureProvider);
    getAddress(): Promise<string>;
    private deduceSignerBySigning;
    checkNonArweaveSigningAvailability(bundling: boolean): void;
    checkBundlerSignerAvailability(bundling: boolean): void;
    private assignArweaveSigner;
    private assertEnvForCustomSigner;
    private isCustomSignature;
    private isValidBundlerSignature;
}
//# sourceMappingURL=Signature.d.ts.map