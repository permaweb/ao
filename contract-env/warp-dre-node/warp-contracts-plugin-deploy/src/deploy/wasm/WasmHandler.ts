/* eslint-disable */
import metering from 'warp-wasm-metering';
import fs, { PathOrFileDescriptor } from 'fs';
import { matchMutClosureDtor, WARP_TAGS } from 'warp-contracts';

const wasmTypeMapping: Map<number, string> = new Map([
  // [1, 'assemblyscript'],
  [2, 'rust']
  /*[3, 'go']
  [4, 'swift'],
    [5, 'c']*/
]);

export class WasmHandler {
  src: string | Buffer;
  wasmSrcCodeDir: string;
  wasmGlueCode: string;

  constructor(src: string | Buffer, wasmSrcCodeDir: string, wasmGlueCode: string) {
    this.src = src;
    this.wasmSrcCodeDir = wasmSrcCodeDir;
    this.wasmGlueCode = wasmGlueCode;
  }

  async createWasmSrc() {
    const data: Buffer[] = [];
    let wasmVersion: string;
    const metadata = {};

    const meteredWasmBinary = metering.meterWASM(this.src, {
      meterType: 'i32'
    });
    data.push(this.src as any);

    const wasmModule = await WebAssembly.compile(this.src as Buffer);
    const moduleImports = WebAssembly.Module.imports(wasmModule);
    let lang: number;

    // @ts-ignore
    const module: WebAssembly.Instance = await WebAssembly.instantiate(this.src, dummyImports(moduleImports));
    // @ts-ignore
    if (!module.instance.exports.lang) {
      throw new Error(`No info about source type in wasm binary. Did you forget to export "lang" function?`);
    }
    // @ts-ignore
    lang = module.instance.exports.lang();
    // @ts-ignore
    wasmVersion = module.instance.exports.version();
    if (!wasmTypeMapping.has(lang)) {
      throw new Error(`Unknown wasm source type ${lang}`);
    }

    const wasmLang = wasmTypeMapping.get(lang);
    if (this.wasmSrcCodeDir == null) {
      throw new Error('No path to original wasm contract source code');
    }

    const zippedSourceCode = await this.zipContents(this.wasmSrcCodeDir);
    data.push(zippedSourceCode);

    if (wasmLang == 'rust') {
      if (!this.wasmGlueCode) {
        throw new Error('No path to generated wasm-bindgen js code');
      }
      const wasmBindgenSrc = fs.readFileSync(this.wasmGlueCode, 'utf-8');
      const dtor = matchMutClosureDtor(wasmBindgenSrc);
      metadata['dtor'] = parseInt(dtor);
      data.push(Buffer.from(wasmBindgenSrc));
    }

    const wasmData = this.joinBuffers(data);
    const srcWasmTags = [
      { name: WARP_TAGS.WASM_LANG, value: wasmLang },
      { name: WARP_TAGS.WASM_LANG_VERSION, value: wasmVersion.toString() },
      { name: WARP_TAGS.WASM_META, value: JSON.stringify(metadata) }
    ];
    return { wasmData, srcWasmTags };
  }

  private joinBuffers(buffers: Buffer[]): Buffer {
    const length = buffers.length;
    const result = [];
    result.push(Buffer.from(length.toString()));
    result.push(Buffer.from('|'));
    buffers.forEach((b) => {
      result.push(Buffer.from(b.length.toString()));
      result.push(Buffer.from('|'));
    });
    result.push(...buffers);
    return result.reduce((prev, b) => Buffer.concat([prev, b]));
  }

  private async zipContents(source: PathOrFileDescriptor): Promise<Buffer> {
    const archiver = require('archiver'),
      streamBuffers = require('stream-buffers');
    const outputStreamBuffer = new streamBuffers.WritableStreamBuffer({
      initialSize: 1000 * 1024, // start at 1000 kilobytes.
      incrementAmount: 1000 * 1024 // grow by 1000 kilobytes each time buffer overflows.
    });
    const archive = archiver('zip', {
      zlib: { level: 9 } // Sets the compression level.
    });
    archive.on('error', function (err: any) {
      throw err;
    });
    archive.pipe(outputStreamBuffer);
    archive.directory(source.toString(), source.toString());
    await archive.finalize();
    outputStreamBuffer.end();

    return outputStreamBuffer.getContents();
  }
}

function dummyImports(moduleImports: WebAssembly.ModuleImportDescriptor[]) {
  const imports = {};

  moduleImports.forEach((moduleImport) => {
    if (!Object.prototype.hasOwnProperty.call(imports, moduleImport.module)) {
      imports[moduleImport.module] = {};
    }
    imports[moduleImport.module][moduleImport.name] = function () {};
  });

  return imports;
}
