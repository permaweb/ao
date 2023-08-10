import { DataItem } from '../DataItem';
import { Tag } from '../tags';

export abstract class Signer {
  readonly signer?: any;
  readonly publicKey: Buffer;
  readonly signatureType: number;
  readonly signatureLength: number;
  readonly ownerLength: number;
  readonly pem?: string | Buffer;

  abstract sign(message: Uint8Array, _opts?: any): Promise<Uint8Array> | Uint8Array;
  abstract signDataItem?(dataItem: string | Buffer, tags: Tag[]): Promise<DataItem>;
  abstract setPublicKey?(): Promise<void>;
  abstract getAddress?(): Promise<string>;
  static verify(_pk: string | Buffer, _message: Uint8Array, _signature: Uint8Array, _opts?: any): boolean {
    throw new Error('You must implement verify method on child');
  }
}
