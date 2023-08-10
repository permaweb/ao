import type { JWKInterface } from '../../interface-jwk';
import base64url from 'base64url';
import { getCryptoDriver } from '$/utils';
import { SIG_CONFIG } from '../../constants';
import { Signer } from '../Signer';

export default class ArweaveSigner implements Signer {
  readonly signatureType: number = 1;
  readonly ownerLength: number = SIG_CONFIG[1].pubLength;
  readonly signatureLength: number = SIG_CONFIG[1].sigLength;
  protected jwk: JWKInterface;
  public pk: string;

  constructor(jwk: JWKInterface) {
    this.pk = jwk.n;
    this.jwk = jwk;
  }

  get publicKey(): Buffer {
    return base64url.toBuffer(this.pk);
  }

  sign(message: Uint8Array): Uint8Array {
    return getCryptoDriver().sign(this.jwk, message) as any;
  }

  static async verify(pk: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await getCryptoDriver().verify(pk, message, signature);
  }
}
