export type RemoveFirstArg<T extends (...args: any[]) => any> = 
  T extends (first: any, ...args: infer R) => infer RType 
    ? (...args: R) => RType 
    : never