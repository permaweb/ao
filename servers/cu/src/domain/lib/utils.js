import { __, append, assoc, defaultTo, filter, head, map, pipe, propOr, reduce } from 'ramda'

/**
* Parse tags into a object with key-value pairs of name -> values.
*
* If multiple tags with the same name exist, it's value will be the array of tag values
* in order of appearance
*/
export function parseTags (rawTags) {
  return pipe(
    defaultTo([]),
    reduce(
      (map, tag) => pipe(
        // [value, value, ...] || []
        propOr([], tag.name),
        // [value]
        append(tag.value),
        // { [name]: [value, value, ...] }
        assoc(tag.name, __, map)
      )(map),
      {}
    ),
    /**
    * If the field is only a singly list, then extract the one value.
    *
    * Otherwise, keep the value as a list.
    */
    map((values) => values.length > 1 ? values : values[0])
  )(rawTags)
}

/**
* Pad the block height portion of the sortKey to 12 characters
*
* This should work to increment and properly pad any sort key:
* - 000001257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (full Sequencer sort key)
* - 000001257294,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (Smartweave protocol sort key)
* - 1257294,1694181441598,fb1ebd7d621d1398acc03e108b7a593c6960c6e522772c974cd21c2ba7ac11d5 (missing padding)
* - 1257294 (just block height)
*
* @param {string} sortKey - the sortKey to be padded. If the sortKey is of sufficient length, then no padding
* is added.
*/
export function padBlockHeight (sortKey) {
  if (!sortKey) return sortKey
  const [height, ...rest] = String(sortKey).split(',')
  return [height.padStart(12, '0'), ...rest].join(',')
}

export function findTag (name) {
  return (tags) => pipe(
    defaultTo([]),
    filter(tag => tag.name === name),
    /**
     * TODO: what if multiple tags with same name?
     * For now, just grabbing the first one
     */
    head
  )(tags)
}
