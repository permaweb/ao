interface SemaphoreInterface {
    acquire(weight?: number): Promise<[number, SemaphoreInterface.Releaser]>;
    runExclusive<T>(callback: SemaphoreInterface.Worker<T>, weight?: number): Promise<T>;
    waitForUnlock(weight?: number): Promise<void>;
    isLocked(): boolean;
    getValue(): number;
    setValue(value: number): void;
    release(weight?: number): void;
    cancel(): void;
}
declare namespace SemaphoreInterface {
    interface Releaser {
        (): void;
    }
    interface Worker<T> {
        (value: number): Promise<T> | T;
    }
}
export default SemaphoreInterface;
