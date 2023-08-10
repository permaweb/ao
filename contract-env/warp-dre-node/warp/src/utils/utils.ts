/* eslint-disable */
import copy from 'fast-copy';
import { Buffer } from 'warp-isomorphic';

export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const safeParseInt = (str: string): number => {
  const maybeInt = Number.parseInt(str);

  if (Number.isNaN(maybeInt) && !Number.isSafeInteger(maybeInt)) {
    throw Error(`Failed to cast ${str} to integer`);
  }

  return maybeInt;
};

export const deepCopy = (input: unknown): any => {
  return copy(input);
};

export const mapReplacer = (key: unknown, value: unknown) => {
  if (value instanceof Map) {
    return {
      dataType: 'Map',
      value: Array.from(value.entries())
    };
  } else {
    return value;
  }
};

export const mapReviver = (key: unknown, value: any) => {
  if (typeof value === 'object' && value !== null) {
    if (value.dataType === 'Map') {
      return new Map(value.value);
    }
  }
  return value;
};

export const asc = (a: number, b: number): number => a - b;

export const ascS = (a: string, b: string): number => +a - +b;

export const desc = (a: number, b: number): number => b - a;

export const descS = (a: string, b: string): number => +b - +a;

export function timeout(s: number): { timeoutId: number; timeoutPromise: Promise<any> } {
  let timeoutId = null;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutId = setTimeout(() => {
      clearTimeout(timeoutId);
      reject('timeout');
    }, s * 1000);
  });
  return {
    timeoutId,
    timeoutPromise
  };
}

export function stripTrailingSlash(str: string) {
  return str.endsWith('/') ? str.slice(0, -1) : str;
}

export function indent(callDepth: number) {
  return `[d:${callDepth}]`.padEnd(callDepth * 2, '-').concat('> ');
}

export function bufToBn(buf: Buffer) {
  const hex = [];
  const u8 = Uint8Array.from(buf);

  u8.forEach(function (i) {
    let h = i.toString(16);
    if (h.length % 2) {
      h = '0' + h;
    }
    hex.push(h);
  });

  return BigInt('0x' + hex.join(''));
}

export const isBrowser = new Function('try {return this===window;}catch(e){ return false;}');

export async function getJsonResponse<T>(response: Promise<Response>): Promise<T> {
  let r: Response;
  try {
    r = await response;
  } catch (e) {
    throw new Error(`Error while communicating with gateway: ${JSON.stringify(e)}`);
  }

  if (!r?.ok) {
    const text = await r.text();
    throw new Error(`${r.status}: ${text}`);
  }
  const result = await r.json();
  return result as T;
}
