import { DataItem } from './DataItem';
import { deepHash, stringToBuffer } from '$/utils';

export async function getSignatureData(item: DataItem): Promise<Uint8Array> {
  return deepHash([
    stringToBuffer('dataitem'),
    stringToBuffer('1'),
    stringToBuffer(item.signatureType.toString()),
    item.rawOwner,
    item.rawTarget,
    item.rawAnchor,
    item.rawTags,
    item.rawData,
  ]);
}
