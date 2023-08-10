export enum SignatureConfig {
  ARWEAVE = 1,
  ED25519,
  ETHEREUM,
  SOLANA,
  INJECTEDAPTOS = 5,
  MULTIAPTOS = 6,
  TYPEDETHEREUM = 7,
}

export interface SignatureMeta {
  sigLength: number;
  pubLength: number;
  sigName: string;
}

export const SIG_CONFIG: Record<SignatureConfig, SignatureMeta> = {
  [SignatureConfig.ARWEAVE]: {
    sigLength: 512,
    pubLength: 512,
    sigName: 'arweave',
  },
  [SignatureConfig.ED25519]: {
    sigLength: 64,
    pubLength: 32,
    sigName: 'ed25519',
  },
  [SignatureConfig.ETHEREUM]: {
    sigLength: 65,
    pubLength: 65,
    sigName: 'ethereum',
  },
  [SignatureConfig.SOLANA]: {
    sigLength: 64,
    pubLength: 32,
    sigName: 'solana',
  },
  [SignatureConfig.INJECTEDAPTOS]: {
    sigLength: 64,
    pubLength: 32,
    sigName: 'injectedAptos',
  },
  [SignatureConfig.MULTIAPTOS]: {
    sigLength: 64 * 32 + 4, // max 32 64 byte signatures, +4 for 32-bit bitmap
    pubLength: 32 * 32 + 1, // max 64 32 byte keys, +1 for 8-bit threshold value
    sigName: 'multiAptos',
  },
  [SignatureConfig.TYPEDETHEREUM]: {
    sigLength: 65,
    pubLength: 42,
    sigName: 'typedEthereum',
  },
};
