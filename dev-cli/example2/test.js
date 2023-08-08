var factory = require('./contract.js')

factory().then(i => {
  const hello = i.cwrap('handle', 'string', ['string', 'string', 'string'])
  const result = hello('{"name": "beepboop"}', '', '')
  console.log(result)
})