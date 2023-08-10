import { Tag } from '../graphql/types';
import { concatBuffers } from './buffer';
export declare class Utils {
    static randomID(len?: number): string;
    static atob(a: string): string;
    static btoa(b: string): string;
    static tagValue(tags: Tag[], name: string): string;
}
export declare const groupBy: (obj: any, key: any) => any;
export { concatBuffers };
