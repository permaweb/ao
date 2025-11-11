import { debugLog } from '../logger.js'

function convertToLegacyOutput(jsonRes) {
  let body = {}
  try {
    body = JSON.parse(jsonRes?.results?.json?.body)
    debugLog('info', 'HyperBEAM Response Body:', body)
  } catch (_) { }

  debugLog('info', 'Parsed HyperBEAM Response Body:', body)

  return {
    Output: body?.Output || {},
    Messages: body?.Messages || [],
    Assignments: body?.Assignments || [],
    Spawns: body?.Spawns || [],
    Error: body?.Error,
    ...(body ?? {})
  }
}

const baseParams = {
  method: 'POST',
  'signing-format': 'ans104',
  'accept-bundle': 'true',
}

const httpParams = { ...baseParams, 'accept-codec': 'httpsig@1.0' }
const jsonParams = { ...baseParams, 'require-codec': 'application/json' }

const getAOParams = (type) => ({
  Type: type,
  'Data-Protocol': 'ao',
  Variant: 'ao.N.1'
})

const getTags = (args) =>
  args.tags
    ? Object.fromEntries(args.tags.map(tag => [tag.name, tag.value]))
    : {}

const getData = (args) => args.data ?? '1984'

export function requestWith(deps) {
  return async (args) => {
    try {
      return deps.aoCore.request(args);
    }
    catch (e) {
      throw new Error(e.message ?? 'Error sending request')
    }
  }
}

export function spawnWith(deps) {
  return async (args) => {
    let scheduler = deps.scheduler

    if (!scheduler && deps.url) {
      const schedulerRes = await fetch(`${deps.url}/~meta@1.0/info/address`)
      scheduler = await schedulerRes.text()
    }

    const module = process.env.MODULE || args.module

    if (!scheduler) throw new Error('No scheduler provided')
    if (!module) throw new Error('No module provided')

    const authority = process.env.AUTHORITY || scheduler

    debugLog('info', 'Node URL:', deps.url)
    debugLog('info', 'Scheduler:', scheduler)
    debugLog('info', 'Authority:', authority)
    debugLog('info', 'Module:', module)

    try {
      const params = {
        path: '/push',
        device: 'process@1.0',
        'scheduler-device': 'scheduler@1.0',
        'push-device': 'push@1.0',
        'execution-device': 'genesis-wasm@1.0',
        Authority: authority,
        Scheduler: scheduler,
        Module: module,
        data: getData(args),
        ...getTags(args),
        ...getAOParams('Process'),
        ...httpParams
      }

      const response = await deps.aoCore.request(params)

      try {
        const processId = response.headers.get('process')

        debugLog('info', 'Process ID:', processId)

        if (processId) {
          await retryInitPush(deps, processId, 10)

          return processId
        }

        return null;
      } catch (e) {
        throw new Error(e.message ?? 'Error spawning mainnet process')
      }
    } catch (e) {
      throw new Error(e.message ?? 'Error spawning mainnet process')
    }
  }
}

export function messageWith(deps) {
  return async (args) => {
    try {
      const params = {
        path: `/${args.process}~process@1.0/push`,
        target: args.process,
        data: getData(args),
        ...getTags(args),
        ...getAOParams('Message'),
        ...jsonParams,
      }

      const response = await deps.aoCore.request(params)
      if (response.ok) {
        const parsedResponse = await response.json()

        if (args.opts?.fullResponse) return convertToLegacyOutput(parsedResponse)
        else return parsedResponse.slot
      }
      return null
    } catch (e) {
      throw new Error(e.message ?? 'Error sending mainnet message')
    }
  }
}

export function resultWith(deps) {
  return async (args) => {
    try {
      const params = {
        path: `/${args.process}~process@1.0/compute=${args.slot ?? args.message}`,
        target: args.process,
        data: getData(args),
        ...getTags(args),
        ...jsonParams
      }
      const response = await deps.aoCore.request(params)
      if (response.ok) {
        const parsedResponse = await response.json()
        return convertToLegacyOutput(parsedResponse)
      }
      return null
    } catch (e) {
      throw new Error(e.message ?? 'Error sending mainnet message')
    }
  }
}

export function resultsWith(deps) {
  return async (args) => {
    try {
      const slotParams = {
        path: `/${args.process}/slot/current`,
        ...httpParams
      }

      const slotResponse = await deps.aoCore.request(slotParams)
      if (slotResponse.ok) {
        try {
          const currentSlot = await slotResponse.text();

          const resultsParams = {
            path: `/${args.process}/compute=${currentSlot}`,
            ...jsonParams
          }

          const resultsResponse = await deps.aoCore.request(resultsParams)

          if (resultsResponse.ok) {
            let parsedResultsResponse = await resultsResponse.json();

            return {
              edges: [
                {
                  cursor: currentSlot,
                  node: {
                    ...convertToLegacyOutput(parsedResultsResponse)
                  }
                }
              ]
            }
          }

          return null
        } catch (e) {
          throw new Error(e.message ?? 'Error getting current process slot')
        }
      }
      return null
    } catch (e) {
      throw new Error(e.message ?? 'Error sending mainnet message')
    }
  }
}

export function dryrunWith(deps) {
  return async (args) => {
    try {
      const tags = getTags(args)
      const tagsAsParams = Object.entries(tags)?.length > 0
        ? `&${Object.entries(tags).map(([key, value]) => `${key}=${value}`).join('&')}`
        : ''

      const path = `/${args.process}~process@1.0/as=execution/compute${tagsAsParams}`
      const params = {
        path,
        target: args.process,
        data: getData(args),
        ...jsonParams
      }

      const response = await deps.aoCore.request(params)
      if (response.ok) {
        const parsedResponse = await response.json()
        return convertToLegacyOutput(parsedResponse)
      }
      return null
    } catch (e) {
      throw new Error(e.message ?? 'Error sending mainnet message')
    }
  }
}

async function retryInitPush(deps, processId, maxAttempts = 10) {
  const params = {
    path: `/${processId}/push`,
    target: processId,
    Action: 'Eval',
    data: 'require(\'.process\')._version',
    ...getAOParams('Message'),
    ...httpParams
  }

  let lastError = null

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const initPush = await deps.aoCore.request(params)
      if (initPush.ok) {
        debugLog('info', `Init push succeeded on attempt ${attempt}`);
        return initPush
      } else {
        debugLog('warn', `Init push attempt ${attempt} returned ok=false`, {
          status: initPush.status,
          body: initPush
        })
        lastError = new Error(`Init push returned ok=false (status=${initPush.status})`);
        await new Promise((r) => setTimeout(r, 500));
      }
    } catch (err) {
      debugLog('warn', `Init push attempt ${attempt} threw`, err)
      lastError = err
    }

    if (attempt === maxAttempts) break
  }

  throw new Error(`Init push failed after ${maxAttempts} attempts: ${lastError?.message || 'unknown'}`)
}
