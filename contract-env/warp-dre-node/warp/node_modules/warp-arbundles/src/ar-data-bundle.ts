import { getSignatureData } from './ar-data-base';
import { DataItem } from './DataItem';
import { Signer } from './signing/Signer';
import { getCryptoDriver } from '$/utils';

export async function getSignatureAndId(item: DataItem, signer: Signer): Promise<{ signature: Buffer; id: Buffer }> {
  const signatureData = await getSignatureData(item);

  const signatureBytes = await signer.sign(signatureData);
  const idBytes = await getCryptoDriver().hash(signatureBytes);

  return { signature: Buffer.from(signatureBytes), id: Buffer.from(idBytes) };
}

export async function sign(item: DataItem, signer: Signer): Promise<Buffer> {
  const { signature, id } = await getSignatureAndId(item, signer);
  item.getRaw().set(signature, 2);
  return id;
}
