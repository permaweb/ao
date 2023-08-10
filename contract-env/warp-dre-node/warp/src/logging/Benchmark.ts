export class Benchmark {
  public static measure(): Benchmark {
    return new Benchmark();
  }

  private constructor() {
    // noop
  }

  private start = Date.now();
  private end = null;

  public reset() {
    this.start = Date.now();
    this.end = null;
  }

  public stop() {
    this.end = Date.now();
  }

  public elapsed(rawValue = false): string | number {
    if (this.end === null) {
      this.end = Date.now();
    }

    const result = this.end - this.start;
    return rawValue ? result : `${(this.end - this.start).toFixed(0)}ms`;
  }
}
