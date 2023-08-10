import { Signer } from './Signer';
import ArweaveSigner from './chains/ArweaveSigner';
export type IndexToType = Record<
  number,
  {
    new (...args): Signer;
    readonly signatureLength: number;
    readonly ownerLength: number;
    verify(pk: string | Uint8Array, message: Uint8Array, signature: Uint8Array): Promise<boolean>;
  }
>;

export const indexToType: IndexToType = {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-expect-error
  1: ArweaveSigner,
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // 2: Curve25519,
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-expect-error
  // 3: EthereumSigner,
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-expect-error
  // 4: HexInjectedSolanaSigner,
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-expect-error
  // 5: InjectedAptosSigner,
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-expect-error
  // 6: MultiSignatureAptosSigner,
  // // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // // @ts-expect-error
  // 7: TypedEthereumSigner,
};
