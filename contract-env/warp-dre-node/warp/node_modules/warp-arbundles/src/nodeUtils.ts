export { stringToBuffer, concatBuffers } from 'arweave/node/lib/utils';
export { deepHash } from './deepHash';
import { default as nodeDriver } from 'arweave/node/lib/crypto/node-driver';
import { createPublicKey } from 'crypto';
import type { JWKInterface } from './interface-jwk';

const driver: typeof nodeDriver = nodeDriver['default'] ? nodeDriver['default'] : nodeDriver;

export class CryptoDriver extends driver {
  public getPublicKey(jwk: JWKInterface): string {
    return createPublicKey({
      key: this.jwkToPem(jwk),
      type: 'pkcs1',
      format: 'pem',
    })
      .export({
        format: 'pem',
        type: 'pkcs1',
      })
      .toString();
  }
}

let driverInstance: CryptoDriver;
export function getCryptoDriver(): CryptoDriver {
  return (driverInstance ??= new CryptoDriver());
}
