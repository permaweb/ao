import Arweave from 'arweave';
import base64url from 'base64url';
import { SignatureConfig, SIG_CONFIG } from '../../constants';
import { DataItem } from '../../DataItem';
import { Tag } from '../../tags';
import { Signer } from '../Signer';

export class InjectedArweaveSigner implements Signer {
  public signer: any;
  public publicKey: Buffer;
  readonly ownerLength: number = SIG_CONFIG[SignatureConfig.ARWEAVE].pubLength;
  readonly signatureLength: number = SIG_CONFIG[SignatureConfig.ARWEAVE].sigLength;
  readonly signatureType: SignatureConfig = SignatureConfig.ARWEAVE;

  constructor(windowArweaveWallet: any) {
    this.signer = windowArweaveWallet;
  }

  async setPublicKey(): Promise<void> {
    let arOwner;
    if (this.signer.getPublicKey) {
      arOwner = await this.signer.getPublicKey();
    } else {
      arOwner = await this.signer.getActivePublicKey();
    }
    this.publicKey = base64url.toBuffer(arOwner);
  }

  async sign(message: Uint8Array): Promise<Uint8Array> {
    if (!this.publicKey) {
      await this.setPublicKey();
    }

    const algorithm = {
      name: 'RSA-PSS',
      saltLength: 0,
    };

    const signature = await this.signer.signature(message, algorithm);
    const buf = new Uint8Array(Object.values(signature));
    return buf;
  }

  async signDataItem(data: string | Buffer, tags: Tag[]): Promise<DataItem> {
    if (!this.publicKey) {
      await this.setPublicKey();
    }

    return new DataItem(
      Buffer.from(
        await this.signer.signDataItem({
          data,
          tags,
        })
      )
    );
  }

  static async verify(pk: string, message: Uint8Array, signature: Uint8Array): Promise<boolean> {
    return await Arweave.crypto.verify(pk, message, signature);
  }
}
