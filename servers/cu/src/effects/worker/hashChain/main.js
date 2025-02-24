import { createHash } from 'node:crypto'

const base64UrlToBytes = (b64Url) =>
  Buffer.from(b64Url, 'base64url')

export const hashChain = (prevHashChain, prevAssignmentId) => {
  const hash = createHash('sha256')
  /**
     * For the very first message, there is no previous id,
     * so it is not included in the hashed bytes, to produce the very first
     * hash chain
     */
  if (prevAssignmentId) hash.update(base64UrlToBytes(prevAssignmentId))
  /**
     * Always include the previous hash chain
     */
  hash.update(base64UrlToBytes(prevHashChain))
  return hash.digest('base64url')
}
