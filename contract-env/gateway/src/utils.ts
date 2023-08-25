import fs from 'fs';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { Tag } from 'arweave/node/lib/transaction';
import { Tags } from 'warp-contracts';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function readJSON(path: string): JWKInterface {
  const content = fs.readFileSync(path, 'utf-8');
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error(`File "${path}" does not contain a valid JSON`);
  }
}

export function isTxIdValid(txId: string): boolean {
  const validTxIdRegex = /[a-z0-9_-]{43}/i;
  return validTxIdRegex.test(txId);
}

export function decodeTags(tags: Tags) {
  const decodedTags: { name: string; value: string }[] = [];
  const mappedTags = tags.map((tag: { name: string; value: string }) => {
    return new Tag(tag.name, tag.value);
  });
  mappedTags.forEach((tag: Tag) => {
    let name = tag.get('name', { decode: true, string: true });
    let value = tag.get('value', { decode: true, string: true });
    decodedTags.push({ name, value });
  });

  return decodedTags;
}

export function getTagByName(tags: Tags, name: string) {
  const tagContentType = tags.find((tag: any) => tag.name == name)?.value;
  return tagContentType;
}
