import { map } from 'ramda'
/**
 * @typedef Cron
 * @property {string} interval
 * @property {{ name: string, value: string }[]} [tags]
 *
 * @param {Cron} cron
 * @returns {{ name: string, value: string }[]}
 */

export function serializeCron (cron) {
  function parseInterval (interval = '') {
    if (typeof interval !== 'string') throw new Error('Encountered Error serializing cron: invalid interval')
    const [value, unit] = interval.split('-').map(s => s.trim())
    if (!value || !unit) throw new Error('Encountered Error serializing cron: invalid interval')
    if (!parseInt(value) || parseInt(value) < 0) throw new Error('Encountered Error serializing cron: invalid interval value')

    const singularRegex = /^(millisecond|second|minute|hour|day|month|year|block)$/
    const pluralRegex = /^(milliseconds|seconds|minutes|hours|days|months|years|blocks)$/
    const unitSingularMatch = unit.match(singularRegex)
    const unitPluralMatch = unit.match(pluralRegex)

    if ((parseInt(value) > 1 && !unitPluralMatch) || (parseInt(value) === 1 && !unitSingularMatch)) throw new Error('Encountered Error serializing cron: invalid interval type')
    return `${value}-${unit}`
  }

  function parseTags (tags = []) {
    return map((tag) => {
      if (!tag.name || !tag.value) throw new Error('Encountered Error serializing cron: invalid tag structure')
      if (typeof tag.name !== 'string' || typeof tag.value !== 'string') throw new Error('Encountered Error serializing cron: invalid interval tag types')
      return { name: `Cron-Tag-${tag.name}`, value: tag.value }
    }, tags)
  }
  const interval = parseInterval(cron.interval)
  const tags = parseTags(cron.tags)

  return [{ name: 'Cron-Interval', value: interval }, ...tags]
}
