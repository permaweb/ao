import { ArweaveSigner, createData, Signer, DataItem } from '../index';
import fs from 'fs';
import path from 'path';
import Bundlr from '@bundlr-network/client/build/cjs/cjsIndex';
import {
  createData as createDataArbundles,
  ArweaveSigner as ArweaveSignerArbundles,
  Signer as SignerArbundles,
} from 'arbundles';

describe('Testing Warp Arbundles data item creation', () => {
  let initialState: string;
  let tags: { name: string; value: string }[];
  let signer: Signer;
  let signerArbundles: SignerArbundles;
  let bundlr: any;
  let dataItem: DataItem;

  beforeAll(async () => {
    const wallet = fs.readFileSync(path.join(__dirname, '../../.secrets/wallet.json'), 'utf-8');
    bundlr = new Bundlr('http://node1.bundlr.network', 'arweave', JSON.parse(wallet));
    signer = new ArweaveSigner(JSON.parse(wallet));
    signerArbundles = new ArweaveSignerArbundles(JSON.parse(wallet));
    initialState = JSON.stringify({
      name: 'arbundles',
      targets: ['first', 'second', 'third'],
    });
    tags = [
      { name: 'firstName', value: 'firstValue' },
      { name: 'secondName', value: 'secondValue' },
      { name: 'thirdName', value: 'thirdValue' },
    ];
    dataItem = createData(initialState, signer, { tags });
    await dataItem.sign(signer);
  });

  afterAll(async () => {});

  it('should create data item and upload it correctly to Bundlr', async () => {
    const isValid = await dataItem.isValid();
    expect(isValid).toBe(true);
    const response = await bundlr.uploader.uploadTransaction(dataItem as any, { getReceiptSignature: true });
    expect(response.status).toBe(200);
    expect(response.data.signature).toBeTruthy();
    expect(response.data.block).toBeTruthy();
  });

  it('should create DataItem equal to the one from original arbundles lib', async () => {
    const dataItemArbundles = createDataArbundles(initialState, signerArbundles, { tags });
    await dataItemArbundles.sign(signerArbundles);
    const dataItemParsed = dataItem.toJSON();
    const dataItemArbundlesParsed = dataItemArbundles.toJSON();
    expect(dataItem.getRaw().length).toEqual(dataItemArbundles.getRaw().length);
    expect(dataItemParsed.owner).toEqual(dataItemArbundlesParsed.owner);
    expect(dataItemParsed.data).toEqual(dataItemArbundlesParsed.data);
    expect(dataItemParsed.tags).toEqual(dataItemArbundlesParsed.tags);
  });
});
