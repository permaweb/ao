const cuClient = {
  messages: async function (cuAddress, txId) {
    console.log(`${cuAddress}/result/${txId}`)
    const resultResponse = await fetch(`${cuAddress}/result/${txId}`)
    const resultJson = await resultResponse.json()

    if (!resultJson || !resultJson.messages) {
      return []
    }

    return resultJson.messages
  },

  selectNode: async function (contractId) {
    console.log(`Selecting cu for contract ${contractId}`)
    return 'http://localhost:3005'
  }
}

export default cuClient
