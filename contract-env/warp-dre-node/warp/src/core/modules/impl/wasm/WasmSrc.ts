import { unzip } from 'unzipit';
import { Buffer } from 'warp-isomorphic';
import { LoggerFactory } from '../../../../logging/LoggerFactory';

export class WasmSrc {
  private readonly logger = LoggerFactory.INST.create('WasmSrc');
  readonly splitted: Buffer[];

  constructor(private readonly src: Buffer) {
    this.splitted = this.splitBuffer(src);
    this.logger.debug(`Buffer splitted into ${this.splitted.length} parts`);
  }

  wasmBinary(): Buffer {
    return this.splitted[0];
  }

  async sourceCode(): Promise<Map<string, string>> {
    const { entries } = await unzip(this.splitted[1]);
    const result = new Map<string, string>();

    for (const [name, entry] of Object.entries(entries)) {
      if (entry.isDirectory) {
        continue;
      }
      const content = await entry.text();
      result.set(name, content);
    }

    return result;
  }

  additionalCode(): string | null {
    if (this.splitted.length == 2) {
      return null;
    }
    return this.splitted[2].toString();
  }

  private splitBuffer(inputBuffer: Buffer): Buffer[] {
    let header = '';
    const elements = parseInt(inputBuffer.toString('utf8', 0, 1));

    this.logger.debug(`Number of elements: ${elements}`);
    const l = inputBuffer.length;

    let delimiters = 0;
    let dataStart = 0;

    for (let i = 2; i < l; i++) {
      const element = inputBuffer.toString('utf8', i, i + 1);
      if (element == '|') {
        delimiters++;
      }
      if (delimiters == elements) {
        dataStart = i + 1;
        break;
      }
      header += element;
    }

    this.logger.debug(`Parsed:`, {
      header,
      dataStart
    });

    const lengths = header.split('|').map((l) => parseInt(l));
    this.logger.debug('Lengths', lengths);

    const result: Buffer[] = [];
    for (const length of lengths) {
      const buffer = Buffer.alloc(length);
      const end = dataStart + length;
      inputBuffer.copy(buffer, 0, dataStart, end);
      dataStart = end;
      result.push(buffer);
    }

    return result;
  }
}
