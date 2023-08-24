var factory = require('./contract.js')
var fs = require('fs')

const buff = fs.readFileSync('./contract.wasm')

factory(buff).then(i => {
  //console.log(i)
    
  const hello = i.cwrap('handle', 'string', ['string', 'string', 'string'])
  const result = hello('{"name": "woohoo"}', '{}', '{}')
  console.log(result)
  
})

