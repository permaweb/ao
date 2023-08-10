import SemaphoreInterface from './SemaphoreInterface';
declare class Semaphore implements SemaphoreInterface {
    private _value;
    private _cancelError;
    constructor(_value: number, _cancelError?: Error);
    acquire(weight?: number): Promise<[number, SemaphoreInterface.Releaser]>;
    runExclusive<T>(callback: SemaphoreInterface.Worker<T>, weight?: number): Promise<T>;
    waitForUnlock(weight?: number): Promise<void>;
    isLocked(): boolean;
    getValue(): number;
    setValue(value: number): void;
    release(weight?: number): void;
    cancel(): void;
    private _dispatch;
    private _newReleaser;
    private _drainUnlockWaiters;
    private _weightedQueues;
    private _weightedWaiters;
}
export default Semaphore;
