import * as ArweaveUtils from 'arweave/web/lib/utils';

export interface TransactionConfirmedData {
  block_indep_hash: string;
  block_height: number;
  number_of_confirmations: number;
}
export interface TransactionStatusResponse {
  status: number;
  confirmed: TransactionConfirmedData | null;
}

export interface TransactionInterface {
  format: number;
  id: string;
  last_tx: string;
  owner: string;
  tags: Tag[];
  target: string;
  quantity: string;
  data: Uint8Array;
  reward: string;
  signature: string;
  data_size: string;
  data_root: string;
}

export interface Chunk {
  dataHash: Uint8Array;
  minByteRange: number;
  maxByteRange: number;
}
export interface Proof {
  offset: number;
  proof: Uint8Array;
}

class BaseObject {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;

  public get(field: string): string;
  public get(field: string, options: { decode: true; string: false }): Uint8Array;
  public get(field: string, options: { decode: true; string: true }): string;

  public get(
    field: string,
    options?: {
      string?: boolean;
      decode?: boolean;
    }
  ): string | Uint8Array | Tag[] {
    if (!Object.getOwnPropertyNames(this).includes(field)) {
      throw new Error(`Field "${field}" is not a property of the Arweave Transaction class.`);
    }

    // Handle fields that are Uint8Arrays.
    // To maintain compat we encode them to b64url
    // if decode option is not specificed.
    if (this[field] instanceof Uint8Array) {
      if (options && options.decode && options.string) {
        return ArweaveUtils.bufferToString(this[field]);
      }
      if (options && options.decode && !options.string) {
        return this[field];
      }
      return ArweaveUtils.bufferTob64Url(this[field]);
    }

    if (options && options.decode == true) {
      if (options && options.string) {
        return ArweaveUtils.b64UrlToString(this[field]);
      }

      return ArweaveUtils.b64UrlToBuffer(this[field]);
    }

    return this[field];
  }
}

export class Transaction extends BaseObject implements TransactionInterface {
  public readonly format: number = 2;
  public id = '';
  public readonly last_tx: string = '';
  public owner = '';
  public tags: Tag[] = [];
  public readonly target: string = '';
  public readonly quantity: string = '0';
  public readonly data_size: string = '0';
  public data: Uint8Array = new Uint8Array();
  public data_root = '';
  public reward = '0';
  public signature = '';

  // Computed when needed.
  public chunks?: {
    data_root: Uint8Array;
    chunks: Chunk[];
    proofs: Proof[];
  };

  public constructor(attributes: Partial<TransactionInterface> = {}) {
    super();
    Object.assign(this, attributes);

    // If something passes in a Tx that has been toJSON'ed and back,
    // or where the data was filled in from /tx/data endpoint.
    // data will be b64url encoded, so decode it.
    if (typeof this.data === 'string') {
      this.data = ArweaveUtils.b64UrlToBuffer(this.data as string);
    }

    if (attributes.tags) {
      this.tags = attributes.tags.map((tag: { name: string; value: string }) => {
        return new Tag(tag.name, tag.value);
      });
    }
  }

  public addTag(name: string, value: string) {
    this.tags.push(new Tag(ArweaveUtils.stringToB64Url(name), ArweaveUtils.stringToB64Url(value)));
  }

  public toJSON() {
    return {
      format: this.format,
      id: this.id,
      last_tx: this.last_tx,
      owner: this.owner,
      tags: this.tags,
      target: this.target,
      quantity: this.quantity,
      data: ArweaveUtils.bufferTob64Url(this.data),
      data_size: this.data_size,
      data_root: this.data_root,
      data_tree: this.data_tree,
      reward: this.reward,
      signature: this.signature
    };
  }

  public setOwner(owner: string) {
    this.owner = owner;
  }

  public setSignature({
    id,
    owner,
    reward,
    tags,
    signature
  }: {
    id: string;
    owner: string;
    reward?: string;
    tags?: Tag[];
    signature: string;
  }) {
    this.id = id;
    this.owner = owner;
    if (reward) this.reward = reward;
    if (tags) this.tags = tags;
    this.signature = signature;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async prepareChunks(data: Uint8Array) {
    throw new Error('Should not be called, use arweave-js version.');
  }

  // Returns a chunk in a format suitable for posting to /chunk.
  // Similar to `prepareChunks()` this does not operate `this.data`,
  // instead using the data passed in.
  public getChunk(idx: number, data: Uint8Array) {
    if (!this.chunks) {
      throw new Error(`Chunks have not been prepared`);
    }
    const proof = this.chunks.proofs[idx];
    const chunk = this.chunks.chunks[idx];
    return {
      data_root: this.data_root,
      data_size: this.data_size,
      data_path: ArweaveUtils.bufferTob64Url(proof.proof),
      offset: proof.offset.toString(),
      chunk: ArweaveUtils.bufferTob64Url(data.slice(chunk.minByteRange, chunk.maxByteRange))
    };
  }

  public async getSignatureData(): Promise<Uint8Array> {
    throw new Error('Should not be called, use arweave-js version.');
  }
}

export class Tag extends BaseObject {
  readonly name: string;
  readonly value: string;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public constructor(name: string, value: string, decode = false) {
    super();
    this.name = name;
    this.value = value;
  }
}

export interface JWKPublicInterface {
  kty: string;
  e: string;
  n: string;
}
export interface JWKInterface extends JWKPublicInterface {
  d?: string;
  p?: string;
  q?: string;
  dp?: string;
  dq?: string;
  qi?: string;
}

export interface CreateTransactionInterface {
  format: number;
  last_tx: string;
  owner: string;
  tags: Tag[];
  target: string;
  quantity: string;
  data: string | Uint8Array | ArrayBuffer;
  data_size: string;
  data_root: string;
  reward: string;
}
export interface BlockData {
  nonce: string;
  previous_block: string;
  timestamp: number;
  last_retarget: number;
  diff: string;
  height: number;
  hash: string;
  indep_hash: string;
  txs: string[];
  tx_root: string;
  wallet_list: string;
  reward_addr: string;
  tags: Tag[];
  reward_pool: number;
  weave_size: number;
  block_size: number;
  cumulative_diff: string;
  hash_list_merkle: string;
}
export interface NetworkInfoInterface {
  network: string;
  version: number;
  release: number;
  height: number;
  current: string;
  blocks: number;
  peers: number;
  queue_length: number;
  node_state_latency: number;
}
