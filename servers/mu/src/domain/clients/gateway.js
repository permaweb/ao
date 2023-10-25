


function fetchGatewayProcessWith({logger, GATEWAY_URL}) {
    return async (id) => {
        console.log(id)
        return {
            tags: [
                { name: 'Scheduled-Interval', value: '5-seconds' }
            ]
        }
    }
}

export default {
    fetchGatewayProcessWith
}