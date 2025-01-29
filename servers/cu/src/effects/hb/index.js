import { Readable } from 'node:stream'

import { of } from 'hyper-async'

export function parseMultipartBoundary (req) {
  const contentType = req.headers['content-type'] || ''

  if (!contentType.startsWith('multipart/')) return false

  const boundaryMatch = contentType.match(/boundary="?(.*)"?/)
  if (!boundaryMatch || !boundaryMatch.length) {
    throw new Error(`Boundary not found on multipart type: ${contentType}`)
  }
  return boundaryMatch[1]
}

export const locateProcessWith = () => {
  return async ({ processId, schedulerHint }) => {

  }
}

export const loadProcessWith = () => {
  return async ({ processId, suUrl }) => {

  }
}

export const loadTimestampWith = () => {
  return async ({ processId, suUrl }) => {

  }
}

export const loadMessagesWith = ({ hashChain, fetch, logger, pageSize }) => {
  // maybe implement a little map here to store
  // initial message + process sent along with result request

  return (args) =>
    of(args)
      .map(({
        suUrl,
        processId,
        block: processBlock,
        owner: processOwner,
        tags: processTags,
        moduleId,
        moduleOwner,
        moduleTags,
        from,
        to,
        assignmentId,
        hashChain
      }) => {
        /**
         * TODO:
         * - load messages from SU, either altogether or separte calls
         * - map to a CU message
         */
        return [
          Readable.from([])
        ]
      })
      .toPromise()
}

export const pushResultToMuWith = ({ sign, fetch, logger }) => {
  return ({ muUrl, result }) => {
    /**
     * TODO:
     * - sign result
     * - transform into HTTP signed message
     * - post to the HB MU
     */
  }
}
