function isWalletWith ({ fetch, GRAPHQL_URL, logger }) {
  return async (id) => {
    logger(`Checking if id is a wallet ${id}`)

    /*
            Only if this is actually a tx will this
            return true. That means if it doesnt its
            either a wallet or something else.
        */
    return fetch(`${GRAPHQL_URL.replace('/graphql', '')}/${id}`, { method: 'HEAD' })
      .then((res) => { return !res.ok })
      .catch((_err) => { return true })
  }
}

export default {
  isWalletWith
}
