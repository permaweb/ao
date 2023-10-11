import { assoc, reduce } from 'ramda'

/**
 * TODO: handle parsing multiple tags with the same name as an array
 * Right now, the value is just overwritten with the last tag in the list with that name
 */
export function parseTags (rawTags) {
  return reduce((a, t) => assoc(t.name, t.value, a), {}, rawTags)
}
