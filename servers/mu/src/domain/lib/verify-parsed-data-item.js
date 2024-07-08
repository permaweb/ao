import { anyPass, propOr } from 'ramda'
import { Rejected, Resolved, of } from 'hyper-async'

import { eqOrIncludes, parseTags } from '../utils.js'

export function verifyParsedDataItemWith () {
  const checkTag = (name, pred, err) => (tags) => pred(tags[name])
    ? Resolved(tags)
    : Rejected(`Tag '${name}': ${err}`)

  const isProcessOrMessage = anyPass([eqOrIncludes('Process'), eqOrIncludes('Message')])

  const isTagEqualTo = ({ name, value }) => (tag) => tag.name === name && tag.value === value

  return (dataItem) => of(dataItem)
    .map(propOr([], 'tags'))
    .chain((rawTags) =>
      of(rawTags)
        .map(parseTags)
        .chain(checkTag('Data-Protocol', eqOrIncludes('ao'), 'must contain \'ao\''))
        .chain(checkTag('Type', isProcessOrMessage, 'must be either \'Process\' or \'Message\''))
        /**
         * At this point, we know Type will contain 'Process' 'Message'
         * OR both.
         *
         * So let's find the earliest occurring Type and use
         * that to determine whether or not this data item is an ao Message or Process
         */
        .map(() => {
          const [processIdx, messageIdx] = [
            rawTags.findIndex(isTagEqualTo({ name: 'Type', value: 'Process' })),
            rawTags.findIndex(isTagEqualTo({ name: 'Type', value: 'Message' }))
          ]

          if (processIdx === -1) return { isMessage: true }
          if (messageIdx === -1) return { isMessage: false }
          return { isMessage: messageIdx < processIdx }
        })
    )
}
