import cron from 'node-cron'

async function fetchAndPopulate ({ PROCESS_WHITELIST_URL, GRAPHQL_URL, DB_URL }) {
  // const _processesFile = await fetch(PROCESS_WHITELIST_URL)
  //         .then((res) => res.json())
  //         .catch(err => {
  //             console.error('Error updating hb processes file', err)
  //             return {}
  //         })
}

export async function schedulerLocationsWith ({ PROCESS_WHITELIST_URL, GRAPHQL_URL, DB_URL }) {
  await fetchAndPopulate({ PROCESS_WHITELIST_URL, GRAPHQL_URL, DB_URL })
  cron.schedule('*/5 * * * *', async () => {
    await fetchAndPopulate({ PROCESS_WHITELIST_URL, GRAPHQL_URL, DB_URL })
  }, { runOnInit: true })

  async function locate () {

  }

  async function raw () {

  }

  async function getProcess () {

  }

  return {
    locate,
    raw,
    getProcess
  }
}
