import { NetworkInterface } from 'faces/network';
export declare class NetworkDB {
    private db;
    private started;
    constructor(dbPath: string);
    init(): Promise<boolean>;
    insert(obj: NetworkInterface): Promise<NetworkInterface>;
    findOne(): Promise<NetworkInterface>;
    increment(qty?: number): Promise<boolean>;
}
