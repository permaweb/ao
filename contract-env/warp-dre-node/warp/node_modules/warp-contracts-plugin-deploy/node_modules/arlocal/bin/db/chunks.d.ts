import { Chunk } from 'faces/chunk';
import { Knex } from 'knex';
export declare class ChunkDB {
    private connection;
    constructor(connection: Knex);
    create({ chunk, data_root, data_size, offset, data_path }: Chunk): Promise<string>;
    getByRootAndSize(dataRoot: string, dataSize: number): Promise<any>;
    getRoot(dataRoot: string): Promise<any[]>;
    getByOffset(offset: number): Promise<any>;
    getLowerOffset(offset: number): Promise<any>;
    getLastChunkOffset(): Promise<number>;
}
