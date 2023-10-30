
import Arweave from 'arweave'

// TODO: dependency injection

const GATEWAY_URL = 'arweave.net'
const PORT = 443
const PROTOCOL = 'https'
const TIMEOUT = 40000
const LOGGING = false

const arweave = Arweave.init({
    host: GATEWAY_URL,
    port: PORT,
    protocol: PROTOCOL,
    timeout: TIMEOUT,
    logging: LOGGING,
})

function fetchGatewayProcessWith({logger, GATEWAY_URL}) {
    return async (id) => {
        const edge = await fetchById(id)
        return edge
    }
}

async function fetchById(id) {
    const query = {
		query: `
                query {
                    transactions(
                        ids: ${JSON.stringify([id])},
                    ){
						edges {
							cursor
							node {
								id
								tags {
									name 
									value 
								}
								data {
									size
									type
								}
                                block {
                                    id
                                    timestamp
                                    height
                                }
                        }
                    }
                }
            }
        `
			.replace(/\s+/g, ' ')
			.trim(),
	}

    const response = await arweave.api.post('/graphql', query)

    if(response.data.data) {
        if(response.data.data.transactions.edges.length > 0) {
            return response.data.data.transactions.edges[0]
        }
    }
}

export default {
    fetchGatewayProcessWith
}