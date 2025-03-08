import { Rejected, fromPromise, of } from 'hyper-async'
import base64url from 'base64url'

import { joinUrl } from '../lib/utils.js'
import { encode } from './hb-encode.js'
import { toHttpSigner } from './signer.js'

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

export function requestWith ({ fetch, logger: _logger, HB_URL, signer }) {
  const logger = _logger.child('request')

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
      .chain((request) => of(request)
        .chain(fromPromise(({ url, method, headers, body }) => {
          return fetch(url, { method, headers, body, redirect: 'follow' })
            .then(async res => {
              if (res.status >= 300) return res

              const contentType = res.headers.get('content-type')
              if (contentType && contentType.includes('multipart/form-data')) {
                // TODO: maybe add hbDecode here to decode multipart into maps of { headers, body }
                return { headers: res.headers, body: await res.text() }
              } else if (contentType && contentType.includes('application/json')) {
                const msgJSON = await res.json()
                return { headers: res.headers, ...msgJSON, body }
              } else {
                return { headers: res.headers, body: await res.text() }
              }
            })
        }
        ))
      ).toPromise()
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
        headers.append('slot+integer', id)
        headers.append('accept', 'application/json')
        return toHttpSigner(signer)(toSigBaseArgs({
          url: `${HB_URL}/${processId}/compute&slot+integer=${id}/results/json`,
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

/**
 * @typedef Env3
 * @property {fetch} fetch
 * @property {string} CU_URL
 *
 * @typedef QueryResultsArgs
 * @property {string} process - the id of the process being read
 * @property {string} from - cursor to start the list of results
 * @property {string} to - cursor to stop the list of results
 * @property {string} sort - "ASC" or "DESC" to describe the order of list
 * @property {number} limit - the number of results to return
 *
 * @callback QueryResults
 * @param {QueryResultsArgs} args
 * @returns {Promise<Record<string, any>}
 *
 * @param {Env3} env
 * @returns {QueryResults}
 */
export function queryResultsWith ({ fetch, HB_URL, logger, signer }) {
  return ({ process, from, to, sort, limit }) => {
    // const target = new URL(`${CU_URL}/results/${process}`)
    // const params = new URLSearchParams(target.search)
    // if (from) { params.append('from', from) }
    // if (to) { params.append('to', to) }
    // if (sort) { params.append('sort', sort) }
    // if (limit) { params.append('limit', limit) }
    // target.search = params

    // m2 does not have a results endpoint, but you can
    // access each message by slots, the goal here
    // would be to create a range of query requests
    // based on the above parameters and then resolve
    // them using a promise.all
    return of().chain(fromPromise(async () => {
      // TODO: need to figure out how best to pass this from client
      // const processId = 'Vj1efidjweGtv7YVDmD1rUEd7cUK7MCr6OQ6Jv04Qd0'
      const { headers, body } = await encodeDataItem({ processId })
      // headers.append('slot+integer', id)
      headers.append('accept', 'application/json')
      return toHttpSigner(signer)(toSigBaseArgs({
        url: `${HB_URL}/${processId}/state/now`,
        method: 'GET',
        headers
      })).then((req) => ({ ...req, body }))
    }))
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
      // const err = new RedirectRequested('Redirect with new format!')
      // err.device = 'process@1.0'
      // throw err
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
