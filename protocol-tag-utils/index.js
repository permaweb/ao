const pipe = (...fns) => (i) =>
  fns.reduce((acc, fn) => fn(acc), i)

const defaultTo = (dVal) => (val) => val == null ? dVal : val

const propOr = (defaultV) => (prop) => pipe(
  (obj) => obj ? obj[prop] : obj,
  defaultTo(defaultV)
)

const mapObject = (fn) => (obj) => {
  const res = {}
  for (const key in obj) {
    // eslint-disable-next-line
    if (obj.hasOwnProperty(key)) res[key] = fn(obj[key], key, obj)
  }
  return res
}

const complement = (fn) => (...args) => !fn(...args)

/**
 * @typedef {Object} Tag
 * @property {string} name - The name of the tag
 * @property {string} value - The value of the tag
 */

const findProtocolBoundaries = (protocol) => (tags) => {
  /**
   * Find the start of the tags associated with the Data-Protocol.
   */
  const startIdx = tags.findIndex(t => t.name === 'Data-Protocol' && t.value === protocol)
  if (startIdx === -1) return [0, 0]

  /**
   * There might be additional Data-Protocols after the one we're
   * interested in, so find the end of the tags aka. "up to" a possible
   * next Data-Protocol
   */
  let endIdx = tags.findIndex((t, idx) => idx > startIdx && t.name === 'Data-Protocol' && t.value !== protocol)
  if (endIdx === -1) endIdx = tags.length

  return [startIdx, endIdx]
}

const findFirstProtocolBoundary = (tags) => {
  let idx = tags.findIndex(t => t.name === 'Data-Protocol')
  if (idx === -1) idx = tags.length
  return idx
}

const byName = (name) => (t) => t.name === name

/**
 * @param {string} protocol - The Data-Protocol whose tags will be found
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Tag[]} - An array of tags associated with the Data-Protocol
 */
export const findAll = (protocol, tags) => pipe(
  findProtocolBoundaries(protocol),
  ([start, end]) => tags.slice(start, end)
)(tags)

/**
 * @param {string} protocol - The Data-Protocol
 * @param {string} name - The tag name to search for
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Tag[]} - An array of tags associated with the specified Data-Protocol
 */
export const findAllByName = (protocol, name, tags) => pipe(
  (tags) => findAll(protocol, tags),
  (pTags) => pTags.filter(byName(name))
)(tags)

/**
 * @param {string} protocol - The Data-Protocol
 * @param {string} name - The tag name to search for
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Tag | undefined} - An array of tags associated with the specified Data-Protocol
 */
export const findByName = (protocol, name, tags) => pipe(
  (tags) => findAllByName(protocol, name, tags),
  (arr) => arr[0]
)(tags)

/**
 * @param {string} protocol - The Data-Protocol to associate with the tags
 * @param {Tag[]} pTags - An array of tags to associate with the Data-Protocol
 * @returns {Tag[]} - an array of tags, associated with the Data-Protocol tag, as the first item
 */
export const create = (protocol, pTags) => {
  pTags = pTags.filter(t => t.name !== 'Data-Protocol' || t.value !== protocol)

  if (!pTags.length) return []

  return [
    { name: 'Data-Protocol', value: protocol },
    ...pTags
  ]
}

/**
 * @param {string} protocol - The Data-Protocol to associate with the tags
 * @param {Tag[]} pTags - An array of tags to associate with the Data-Protocol
 * @param {Tag[]} tags - The array of tags being concatenated to
 * @returns {Tag[]} - an array of tags with protocol tags concatenated to the subsection
 */
export const concat = (protocol, pTags, tags) => {
  const [start, end] = findProtocolBoundaries(protocol)(tags)
  let [before, cur, after] = [
    tags.slice(0, start),
    tags.slice(start, end),
    tags.slice(end)
  ]

  if (!cur.length) {
    pTags = create(protocol, pTags)
    before = after
    after = []
  }

  return [before, cur, pTags, after].flat(1)
}

/**
 * @param {Tag[]} others - An array of tags to concatenate to the section
 * not associated with any Data-Protocols (the beginning)
 * @param {Tag[]} tags - The array of tags being concatenated to
 * @returns {Tag[]} - an array of tags with the additional tags added
 */
export const concatUnassoc = (others, tags) => {
  const idx = findFirstProtocolBoundary(tags)
  const [before, after] = [tags.slice(0, idx), tags.slice(idx)]
  return [before, others, after].flat(1)
}

/**
 * @param {string} protocol - The Data-Protocol to associate with the tags
 * @param {Tag[]} pTags - An array of tags to associate with the Data-Protocol
 * @param {Tag[]} tags - The array of tags being concatenated to
 * @returns {Tag[]} - an array of tags with protocol tags updated in the subsection
 */
export const update = (protocol, pTags, tags) => {
  const [start, end] = findProtocolBoundaries(protocol)(tags)
  let [before, after] = [tags.slice(0, start), tags.slice(end)]

  if (after.length === tags.length) {
    before = after
    after = []
  }

  return [before, create(protocol, pTags), after].flat(1)
}

/**
 * @param {string} protocol - The Data-Protocol to associate with the tags
 * @param {Tag[]} tags - The array of tags being removed from
 * @returns {Tag[]} - an array of tags with protocol tags removed
 */
export const removeAll = (protocol, tags) => update(protocol, [], tags)

/**
 * @param {string} protocol - The Data-Protocol to associate with the tags
 * @param {string} name - The name of the tags to remove in the protocol
 * @param {Tag[]} tags - The array of tags being removed from
 * @returns {Tag[]} - an array of tags with protocol tags removed
 */
export const removeAllByName = (protocol, name, tags) => {
  const [start, end] = findProtocolBoundaries(protocol)(tags)
  const [before, cur, after] = [tags.slice(0, start), tags.slice(start, end), tags.slice(end)]
  return [before, create(protocol, cur.filter(complement(byName(name)))), after].flat(1)
}

/**
 * By default, only the value of a tag's first occurrence is used.
 *
 * Instead, if multi is set to true, then each key will contain an array
 * of values, in order of occurrence.
 */
const parseTags = (tags, multi = false) => pipe(
  defaultTo([]),
  /**
   * Mutation is okay here, since it's
   * an internal data structure
   */
  (tags) => tags.reduce(
    (parsed, tag) => pipe(
      // [value, value, ...] || []
      propOr([])(tag.name),
      // [value]
      (arr) => { arr.push(tag.value); return arr },
      // { [name]: [value, value, ...] }
      (arr) => { parsed[tag.name] = arr; return parsed }
    )(parsed),
    {}
  ),
  mapObject((values) => multi ? values : values[0])
)(tags)

const parseProtocol = (protocol, tags, multi) => pipe(
  defaultTo([]),
  (tags) => findAll(protocol, tags),
  (tags) => parseTags(tags, multi)
)(tags)

/**
 * @param {string} protocol - The Data-Protocol whose tags will be parsed
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Record<string, Tag[]>} - The object with key-value pairs of name -> an array of values.
 */
export const parseAll = (protocol, tags) => parseProtocol(protocol, tags, true)

/**
 * @param {string} protocol - The Data-Protocol whose tags will be parsed
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Record<string, Tag>} - The object with key-value pairs of name -> an array of values.
 */
export const parse = (protocol, tags) => parseProtocol(protocol, tags, false)

/**
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Record<string, Tag>} - The object with key-value pairs of name -> an array of values.
 */
export const parseUnassoc = (tags) => {
  const idx = findFirstProtocolBoundary(tags)
  return parseTags(tags.slice(0, idx), false)
}

/**
 * @param {Tag[]} tags - An array of tags to filter
 * @returns {Record<string, Tag[]>} - The object with key-value pairs of name -> an array of values.
 */
export const parseAllUnassoc = (tags) => {
  const idx = findFirstProtocolBoundary(tags)
  return parseTags(tags.slice(0, idx), true)
}

/**
 * @param {string} p - the protocol to scope all apis to
 * @returns a parse-data-protocol api scoped to the protocol
 */
export const proto = (p) => ({
  /**
   * @type {import('./types').RemoveFirstArg<findAll>}
   */
  findAll: (tags) => findAll(p, tags),
  /**
   * @type {import('./types').RemoveFirstArg<findAllByName>}
   */
  findAllByName: (name, tags) => findAllByName(p, name, tags),
  /**
   * @type {import('./types').RemoveFirstArg<findByName>}
   */
  findByName: (name, tags) => findByName(p, name, tags),
  /**
   * @type {import('./types').RemoveFirstArg<create>}
   */
  create: (tags) => create(p, tags),
  /**
   * @type {import('./types').RemoveFirstArg<update>}
   */
  update: (pTags, tags) => update(p, pTags, tags),
  /**
   * @type {import('./types').RemoveFirstArg<concat>}
   */
  concat: (pTags, tags) => concat(p, pTags, tags),
  /**
   * @type {import('./types').RemoveFirstArg<removeAll>}
   */
  removeAll: (tags) => removeAll(p, tags),
  /**
   * @type {import('./types').RemoveFirstArg<removeAllByName>}
   */
  removeAllByName: (name, tags) => removeAllByName(p, name, tags),
  /**
   * @type {import('./types').RemoveFirstArg<parse>}
   */
  parse: (tags) => parse(p, tags),
  /**
   * @type {import('./types').RemoveFirstArg<parseAll>}
   */
  parseAll: (tags) => parseAll(p, tags),
  concatUnassoc,
  parseUnassoc,
  parseAllUnassoc
})
