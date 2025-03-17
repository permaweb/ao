import { Rejected, fromPromise, of } from 'hyper-async'
import { omit, keys } from 'ramda'
import base64url from 'base64url'

import { joinUrl } from '../lib/utils.js'
import { encode } from './hb-encode.js'
import { toHttpSigner, toDataItemSigner } from './signer.js'

let reqFormatCache = {}

/**
 * Map data item members to corresponding HB HTTP message
 * shape
 */
export async function encodeDataItem ({ processId, data, tags, anchor }) {
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

function toSigBaseArgs ({ url, method, headers, includePath = false }) {
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

export function httpSigName (address) {
  const decoded = base64url.toBuffer(address)
  const hexString = [...decoded.subarray(1, 9)]
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')
  return `http-sig-${hexString}`
}

export function requestWith(args) {
  const { fetch, logger: _logger, HB_URL, signer } = args
  let signingFormat = args.signingFormat
  const logger = _logger.child('request')

  return async function(fields) {
    const { path, method, ...restFields } = fields
  
    if (!signingFormat) {
      signingFormat = reqFormatCache[fields.path] ?? 'HTTP'
    }
    
    try {

      let fetch_req = { }
      console.log('SIGNING FORMAT: ', signingFormat, '. REQUEST: ', fields)
      if (signingFormat === 'ANS-104') {
        const ans104Request = toANS104Request(restFields)
        console.log('ANS-104 REQUEST PRE-SIGNING: ', ans104Request)
        const signedRequest = await toDataItemSigner(signer)(ans104Request.item)
        console.log('SIGNED ANS-104 ITEM: ', signedRequest)
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
      
      // Log the request
      logger.tap('Sending signed message to HB: %o')(fetch_req)
      
      // Step 4: Send the request
      const res = await fetch(fetch_req.url, { 
        method: fetch_req.method, 
        headers: fetch_req.headers, 
        body: fetch_req.body, 
        redirect: 'follow' 
      })
      
      console.log('PUSH FORMAT: ', signingFormat, '. RESPONSE:', res)
      
      // Step 5: Handle specific status codes
      if (res.status === 422 && signingFormat === 'HTTP') {
        // Try again with different signing format
        reqFormatCache[fields.path] = 'ANS-104'
        return requestWith({ ...args, signingFormat: 'ANS-104' })(fields)
      }
      
      if (res.status >= 400) {
        console.log('ERROR RESPONSE: ', res)
        process.exit(1)
        throw new Error(`${res.status}: ${await res.text()}`)
      }
      
      if (res.status >= 300) {
        return res
      }
      
      // Step 6: Return the response
      return {
        headers: res.headers,
        body: await res.text()
      }
    } catch (error) {
      // Handle errors appropriately
      console.error("Request failed:", error)
      throw error
    }
  }
}

export function deployProcessWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('deployProcess')

  return (args) => {
    return of(args)
      /**
       * disregard data item signer passed, as it is not needed
       * when the HTTP msg is what is actually signed
       */
      .chain(fromPromise(({ processId, data, tags }) =>
        encodeDataItem({ processId, data, tags })
      ))
      .chain(fromPromise(({ headers, body }) => {
        return toHttpSigner(signer)(toSigBaseArgs({
          url: `${HB_URL}/schedule`,
          method: 'POST',
          headers
        })).then((req) => ({ ...req, body }))
      }))
      .map(logger.tap('Sending HTTP signed message to HB MU: %o'))
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) =>
          fetch(url, { method, headers, body, redirect: 'follow' })
        ))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async (res) => {
            if (res.ok) return res.headers.get('process')
            throw new Error(`${res.status}: ${await res.text()}`)
          })
        )
        .bimap(
          logger.tap('Error encountered when deploying process via HB MU'),
          logger.tap('Successfully deployed process via HB MU')
        )
        .map((process) => ({ processId: process }))
      )
      .toPromise()
  }
}

export function deployMessageWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('deployMessage')

  return (args) => {
    return of(args)
      /**
       * disregard data item signer passed, as it is not needed
       * when the HTTP msg is what is actually signed
       */
      .chain(fromPromise(({ processId, data, tags, anchor }) =>
        encodeDataItem({ processId, data, tags, anchor })
      ))
      .chain(fromPromise(({ headers, body }) => {
        return toHttpSigner(signer)(toSigBaseArgs({
          url: `${HB_URL}/${args.processId}/schedule`,
          method: 'POST',
          headers
        })).then((req) => ({ ...req, body }))
      }))
      .map(logger.tap('Sending HTTP signed message to HB MU: %o'))
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) =>
          fetch(url, { method, headers, body, redirect: 'follow' })
        ))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async (res) => {
            if (res.ok) {
              return {
                slot: res.headers.get('slot'),
                processId: args.processId
              }
            }
            throw new Error(`${res.status}: ${await res.text()}`)
          })
        )
        .map(logger.tap('Received slot from HB MU: %o'))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async ({ slot, processId }) => {
            const { headers, body } = await encodeDataItem({ processId })
            return toHttpSigner(signer)(toSigBaseArgs({
              url: `${HB_URL}/${processId}/push&slot+integer=${slot}`,
              method: 'POST',
              headers
            })).then((req) => ({ ...req, body }))
              .then(req => fetch(req.url, { method: req.method, headers: req.headers, body: req.body, redirect: 'follow' }))
              .then(() => slot)
          })
        )
        .bimap(
          logger.tap('Error encountered when writing message via HB MU'),
          logger.tap('Successfully wrote message via HB MU')
        )
        .map((slot) => ({ messageId: slot }))
      )
      .toPromise()
  }
}

export function loadResultWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('loadResult')

  return (args) => {
    return of(args)
      .chain(fromPromise(async ({ id, processId }) => {
        const { headers, body } = await encodeDataItem({ processId })
        headers.append('slot', id)
        headers.append('accept', 'application/json')
        return toHttpSigner(signer)(toSigBaseArgs({
          url: `${HB_URL}/${processId}~process@1.0/compute&slot=${id}/results/json`,
          method: 'POST',
          headers
        })).then((req) => ({ ...req, body }))
      }))
      .map(logger.tap('fetching message result from HB CU: %o'))
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) =>
          fetch(url, { method, headers, body, redirect: 'follow' })
        ))
        .bichain(
          (err) => Rejected(err),
          fromPromise(async (res) => {
            if (res.ok) return res.json()
            throw new Error(`${res.status}: ${await res.text()}`)
          })
        )
        .bimap(
          logger.tap('Error encountered when loading result via HB CU'),
          logger.tap('Successfully loading result via HB CU')
        )
      )
      .toPromise()
  }
}

export function toANS104Request(fields) {
  console.log('TO ANS 104 REQUEST: ', fields)
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
          'method'
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
  console.log('ANS104 REQUEST: ', dataItem)
  return { headers: { 'Content-Type': 'application/ans104', 'codec-device': 'ans104@1.0' }, item: dataItem }
}

export class InsufficientFunds extends Error {
  name = 'InsufficientFunds'
}

export class RedirectRequested extends Error {
  name = 'RedirectRequested'
}

export function relayerWith ({ fetch, logger, HB_URL, signer }) {
  /**
   * A fetch wrapper that will sign
   *
   * This will then redirect calls to the
   * configured HyperBEAM node, specifically to the
   * relay device
   */
  return async (url, options) => {
    const parsed = new URL(url)
    options.headers = new Headers(options.headers)
    const relayUrl = parsed.href
    /**
     * TODO: should we only use a header instead?
     * For now, including both header and query param
     */
    const relayParams = new URLSearchParams({ 'relay-path': relayUrl })

    const hb = `${HB_URL}/~relay@1.0/call?${relayParams.toString()}`
    logger('Relaying "%s" through HyperBEAM Node "%s"', parsed.href, hb)

    /**
     * Only sign the relay-path header being added
     *
     * TODO: should we mimick a fetch error on failure to sign
     * ie. TypeError? For now, just letting this bubble
     */
    const { headers: signedHeaders } = await toHttpSigner(signer)({
      fields: [
        ...options.headers.keys(),
        'relay-path'
      ].sort(),
      request: {
        url,
        ...options,
        headers: { ...Object.fromEntries(options.headers), 'relay-path': relayUrl }
      }
    })

    return fetch(hb, { ...options, headers: signedHeaders }).then(res => {
      if (res.status === 400) {
        const err = new InsufficientFunds('Insufficient Funds for request!')
        err.price = res.headers.get('price')
        throw err
      }
      if (res.status === 422) {
        const err = new RedirectRequested('Redirect with new format!')
        err.contentEncoding = res.headers.get('content-encoding')
        err.device = res.headers.get('accept-device')
        err.location = res.headers.get('location')
        throw err
      }
      return res
    })
  }
}
