const Module = require('./process.js')

globalThis.Extensions = {
  Log: (s) => {
    console.log(s)
    return 's'
  }
}

async function main () {
  const instance = await Module()
  const doHandle = instance.cwrap('handle', 'string', ['string', 'string'])
  console.log(doHandle(JSON.stringify({
    Id: '1234',
    Target: 'TEST',
    Owner: 'TEST',
    Tags: [],
    Data: ''
  }), JSON.stringify({
    Process: { Id: '1234', Tags: [] }
  })))
}

main()
