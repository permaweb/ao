import { Rejected, fromPromise, of } from 'hyper-async'
import { omit, keys } from 'ramda'
import base64url from 'base64url'

import { joinUrl } from '../lib/utils.js'
import { encode } from './hb-encode.js'
import { toHttpSigner, toDataItemSigner } from './signer.js'
import { verboseLog } from '../logger.js'

let reqFormatCache = {}

/**
 * Map data item members to corresponding HB HTTP message
 * shape
 */
export async function encodeDataItem({ processId, data, tags, anchor }) {
  const obj = {}

  if (processId) obj.target = processId
  if (anchor) obj.anchor = anchor
  if (tags) tags.forEach(t => { obj[t.name.toLowerCase()] = t.value })
  /**
   * Always ensure the variant is mainnet for hyperbeam
   * TODO: change default variant to be this eventually
   */
  obj.variant = 'ao.N.1'
  obj.data = data

  const res = await encode(obj)
  if (!res) return { headers: new Headers(), body: undefined }
  return res
}

function toSigBaseArgs({ url, method, headers, includePath = false }) {
  headers = new Headers(headers)
  return {
    /**
     * Always sign all headers, and the path,
     * and that there is a deterministic signature
     * component ordering
     *
     * TODO: removing path from signing, for now.
     */
    fields: [
      ...headers.keys(),
      ...(includePath ? ['@path'] : [])
    ].sort(),
    request: { url, method, headers: { ...Object.fromEntries(headers) } }
  }
}

export function httpSigName(address) {
  const decoded = base64url.toBuffer(address)
  const hexString = [...decoded.subarray(1, 9)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  return `http-sig-${hexString}`
}

async function hashAndBase64(input) {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashBase64 = btoa(String.fromCharCode(...hashArray));
  return hashBase64;
}

function extractSignature(header) {
  const match = header.match(/Signature:\s*'http-sig-[^:]+:([^']+)'/);
  return match ? match[1] : null;
}


export function processIdWith({ logger: _logger, signer, HB_URL }) {
  const logger = _logger.child('id')
  return (fields) => {
    const { path, method, ...restFields } = fields
    return of({ path, method, fields: restFields })
      .chain(fromPromise(({ path, method, fields }) => {
        return encode(fields).then(({ headers, body }) => ({
          path,
          method,
          headers,
          body
        }))
      }
      ))
      .chain(fromPromise(async ({ path, method, headers, body }) =>
        toHttpSigner(signer)(toSigBaseArgs({
          url: joinUrl({ url: HB_URL, path }),
          method,
          headers
          // this does not work with hyperbeam
          // includePath: true
        })).then((req) => ({ ...req, body }))
      ))
      .map(logger.tap('Sending HTTP signed message to HB: %o'))
      .chain(fromPromise(res => {

        return hashAndBase64(extractSignature(res.headers.Signature))
      }))
      .toPromise()
  }
}
// headers is not pulling accept-bundle
// signingFormat should be signing-format
export function requestWith(args) {
  const { fetch, logger: _logger, HB_URL, signer } = args
  // let signingFormat = args.signingFormat
  let signingFormat = args['signing-format'] || args.signingFormat
  const logger = _logger.child('request')

  return async function (fields) {
    const { path, method, ...restFields } = fields

    signingFormat = fields['signing-format'] || fields.signingFormat
    if (!signingFormat) {
      signingFormat = reqFormatCache[fields.path] ?? 'HTTP'
    }

    try {
      let fetch_req = {}

      verboseLog('SIGNING FORMAT: ', signingFormat, '. REQUEST: ', fields);

      if (signingFormat === 'ANS-104') {
        const ans104Request = toANS104Request(restFields)
        verboseLog('ANS-104 REQUEST PRE-SIGNING: ', ans104Request)

        const signedRequest = await toDataItemSigner(signer)(ans104Request.item)
        verboseLog('SIGNED ANS-104 ITEM: ', signedRequest)

        fetch_req = {
          body: signedRequest.raw,
          url: joinUrl({ url: HB_URL, path }),
          path,
          method,
          headers: ans104Request.headers
        }
      }
      else {
        // Step 2: Create and execute the signing request
        const req = await encode(restFields)
        const signingArgs = toSigBaseArgs({
          url: joinUrl({ url: HB_URL, path }),
          method: method,
          headers: req.headers
        })

        const signedRequest = await toHttpSigner(signer)(signingArgs)
        fetch_req = { ...signedRequest, body: req.body, path, method }
      }

      verboseLog('Sending signed message to HB: %o')

      // Step 4: Send the request
      const res = await fetch(fetch_req.url, {
        method: fetch_req.method,
        headers: fetch_req.headers,
        body: fetch_req.body,
        redirect: 'follow'
      })

      verboseLog('PUSH FORMAT: ', signingFormat, '. RESPONSE:', res)

      // Step 5: Handle specific status codes
      if (res.status === 422 && signingFormat === 'HTTP') {
        // Try again with different signing format
        reqFormatCache[fields.path] = 'ANS-104'
        return requestWith({ ...args, signingFormat: 'ANS-104' })(fields)
      }

      if (res.status == 500) {
        verboseLog('ERROR RESPONSE: ', res)
        throw new Error(`${res.status}: ${await res.text()}`)
      }

      if (res.status === 404) {
        verboseLog('ERROR RESPONSE: ', res)
        throw new Error(`${res.status}: ${await res.text()}`)
      }

      if (res.status >= 400) {
        logger.tap('ERROR RESPONSE: ', res)
        throw new Error(`${res.status}: ${await res.text()}`)
      }

      if (res.status >= 300) {
        return res
      }

      let body = await res.text()
      // Step 6: Return the response
      return {
        headers: res.headers,
        body: body
      }
    } catch (error) {
      // Handle errors appropriately
      verboseLog('ERROR RESPONSE: ', error)
      throw error
    }
  }
}

export function toANS104Request(fields) {
  verboseLog('TO ANS 104 REQUEST: ', fields)
  const dataItem = {
    target: fields.target,
    anchor: fields.anchor ?? '',
    tags: keys(
      omit(
        [
          'Target',
          'target',
          'Anchor',
          'anchor',
          'Data',
          'data',
          'data-protocol',
          'Data-Protocol',
          'variant',
          'Variant',
          'dryrun',
          'Dryrun',
          'Type',
          'type',
          'path',
          'method',
          'signingFormat',
          'signing-format'
        ],
        fields
      )
    )
      .map(function (key) {
        return { name: key, value: fields[key] }
      }, fields)
      .concat([
        { name: 'Data-Protocol', value: 'ao' },
        { name: 'Type', value: fields.Type ?? 'Message' },
        { name: 'Variant', value: fields.Variant ?? 'ao.N.1' }
      ]),
    data: fields?.data || ''
  }
  verboseLog('ANS104 REQUEST: ', dataItem)
  return { headers: { 
    'Content-Type': 'application/ans104', 
    'codec-device': 'ans104@1.0',
    'accept-bundle': 'true'
  }, item: dataItem }
}

