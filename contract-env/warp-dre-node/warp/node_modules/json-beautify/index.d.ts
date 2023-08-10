/*
* json-beautify typings
* @author TeodorDre
* @Github - https://github.com/TeodorDre
*
*/

declare module 'json-beautify' {
  export default function beautify (value: any, replacer: Function | object | any[], space: number | string, limit?: number): string
}
