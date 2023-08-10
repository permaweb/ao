"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Benchmark = void 0;
class Benchmark {
    static measure() {
        return new Benchmark();
    }
    constructor() {
        this.start = Date.now();
        this.end = null;
        // noop
    }
    reset() {
        this.start = Date.now();
        this.end = null;
    }
    stop() {
        this.end = Date.now();
    }
    elapsed(rawValue = false) {
        if (this.end === null) {
            this.end = Date.now();
        }
        const result = this.end - this.start;
        return rawValue ? result : `${(this.end - this.start).toFixed(0)}ms`;
    }
}
exports.Benchmark = Benchmark;
//# sourceMappingURL=Benchmark.js.map