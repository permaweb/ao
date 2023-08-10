export declare class Benchmark {
    static measure(): Benchmark;
    private constructor();
    private start;
    private end;
    reset(): void;
    stop(): void;
    elapsed(rawValue?: boolean): string | number;
}
//# sourceMappingURL=Benchmark.d.ts.map