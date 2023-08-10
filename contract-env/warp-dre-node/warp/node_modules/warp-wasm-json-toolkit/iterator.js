const Buffer = require('warp-isomorphic').Buffer;
const leb128 = require('leb128').unsigned;
const wasm2json = require('./wasm2json.js');
const Pipe = require('buffer-pipe');

const SECTIONS = [
  'custom',
  'type',
  'import',
  'function',
  'table',
  'memory',
  'global',
  'export',
  'start',
  'element',
  'code',
  'data',
];

/**
 * The Module Iterator allows for iteration over a webassembly module's sections.
 * A section is wrapped in a section class. A section class instance allows you
 * append entries to a given section
 */
module.exports = class ModuleIterator {
  /**
   * param {Buffer} wasm - a webassembly binary
   */
  constructor(wasm) {
    this._wasm = wasm;
    this._sections = [];
    this._modified = false;
  }

  /**
   * if the orignal wasm module was modified then this will return the modified
   * wasm module
   */
  get wasm() {
    if (this._modified) {
      this._wasm = Buffer.concat(this._sections.concat(this._pipe.buffer));
      this._modified = false;
    }
    return this._wasm;
  }

  /**
   * Iterates through the module's sections
   * return {Iterator.<Section>}
   */
  *[Symbol.iterator]() {
    this._pipe = new Pipe(this._wasm);
    this._sections = [this._pipe.read(8)];
    while (!this._pipe.end) {
      const start = this._pipe.bytesRead;
      const sectionType = this._pipe.read(1)[0];
      const size = Number(leb128.read(this._pipe));
      const body = this._pipe.read(size);
      const end = this._pipe.bytesRead;
      const section = this._wasm.slice(start, end);
      const index = this._sections.push(section) - 1;

      yield new Section(sectionType, body, this, index);
    }
  }

  _update(index, data) {
    this._modified = true;
    this._sections[index] = data;
  }
};

/**
 * The section class is always internal created by the Module class. And return
 * through the Module's iternator
 */
class Section {
  constructor(sectionType, section, it, index) {
    this._it = it;
    this._index = index;
    this.type = SECTIONS[sectionType];
    this._type = sectionType;
    this._section = section;

    const pipe = new Pipe(section);
    if (this.type !== 'custom') {
      this.count = Number(leb128.read(pipe));
    }
    this._body = pipe.buffer;
  }

  /**
   * Parses the section and return the JSON repesentation of it
   * returns {Object}
   */
  toJSON() {
    return wasm2json.sectionParsers[this.type](new Pipe(this._section));
  }

  /**
   * Appends an array of entries to this section. NOTE: this will modify the
   * parent wasm module.
   * @param {Arrayy.<Buffer>} entries
   */
  appendEntries(entries) {
    this.count += entries.length;
    this._body = Buffer.concat([this._body].concat(entries));

    const bodyAndCount = Buffer.concat([leb128.encode(this.count), this._body]);

    // encode length has save modifed section
    this._it._update(
      this._index,
      Buffer.concat([
        Buffer.from([this._type]),
        leb128.encode(bodyAndCount.length),
        bodyAndCount,
      ])
    );
  }
}
