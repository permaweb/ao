const immediates = require('./immediates.json')

module.exports = (text) => {
  const json = []
  const textArray = text.split(/\s|\n/)
  while (textArray.length) {
    const textOp = textArray.shift()
    const jsonOp = {}

    let [type, name] = textOp.split('.')

    if (name === undefined) {
      name = type
    } else {
      jsonOp.return_type = type
    }

    jsonOp.name = name

    const immediate = immediates[jsonOp.name === 'const' ? jsonOp.return_type : jsonOp.name]

    if (immediate) {
      jsonOp.immediates = immediataryParser(immediate, textArray)
    }

    json.push(jsonOp)
  }
  return json
}

function immediataryParser (type, txt) {
  const json = {}
  switch (type) {
    case 'br_table':
      const dests = []

      while (1) {
        let dest = txt[0]
        if (isNaN(dest)) break
        txt.shift()
        dests.push(dest)
      }

      return dests
    case 'call_indirect':
      json.index = txt.shift()
      json.reserved = 0
      return json
    case 'memory_immediate':
      json.flags = txt.shift()
      json.offset = txt.shift()
      return json
    default:
      return txt.shift()
  }
}
