import { debugLog } from '../logger.js'

function normalizeOutput(jsonRes) {
  debugLog('info', 'HyperBEAM Response Body Raw:', jsonRes);

  let body = jsonRes ?? {};
  try {
    if (typeof body === 'string') body = JSON.parse(body)

    const legacyJsonBody = body?.results?.json?.body
    body = typeof legacyJsonBody === 'string'
      ? JSON.parse(legacyJsonBody)
      : body?.raw ?? body?.results?.raw ?? body
  } catch {}

  debugLog('info', 'Parsed HyperBEAM Response Body:', body);

  return {
    Output: body.Output ?? body.output ?? {},
    Messages: body.Messages ?? body.messages ?? [],
    Assignments: body.Assignments ?? body.assignments ?? [],
    Spawns: body.Spawns ?? body.spawns ?? [],
    Error: body.Error ?? body.error,
    ...body,
  };
}

const baseParams = {
  method: 'POST',
  'signing-format': 'ans104',
  'accept-bundle': 'true',
}

const httpParams = { ...baseParams, 'accept-codec': 'httpsig@1.0' }
const jsonParams = {
  ...baseParams,
  accept: 'application/json',
  'require-codec': 'application/json'
}

const GENESIS_WASM_EXECUTION_DEVICE = 'genesis-wasm@1.0'
const LUA_EXECUTION_DEVICE = 'lua@5.3a'
const luaProcessesByConnection = new WeakMap()

const isLuaExecutionDevice = (device) =>
  ['lua@5.3', LUA_EXECUTION_DEVICE, 'hyper-aos'].includes(device)

const findTag = (args, tagName) =>
  args.tags?.find(({ name }) => name.toLowerCase() === tagName)?.value

const getExecutionDevice = (args, taggedDevice) => {
  const requestedDevice = args.executionDevice ?? args.type ?? taggedDevice

  if (isLuaExecutionDevice(requestedDevice)) {
    return LUA_EXECUTION_DEVICE
  }

  if (requestedDevice === 'genesis-wasm') return GENESIS_WASM_EXECUTION_DEVICE
  return requestedDevice ?? GENESIS_WASM_EXECUTION_DEVICE
}

const getAOParams = (type, lowercase = false) => lowercase
  ? {
      type,
      'data-protocol': 'ao',
      variant: 'ao.N.1'
    }
  : {
      Type: type,
      'Data-Protocol': 'ao',
      Variant: 'ao.N.1'
    }

const getTags = (args, lowercase = false) =>
  args.tags
    ? Object.fromEntries(args.tags.map(tag => [lowercase ? tag.name.toLowerCase() : tag.name, tag.value]))
    : {}

const rememberLuaProcess = (deps, processId) => {
  const processIds = luaProcessesByConnection.get(deps) ?? new Set()
  processIds.add(processId)
  luaProcessesByConnection.set(deps, processIds)
}

const isLuaMessage = (deps, args) =>
  isLuaExecutionDevice(args.executionDevice ?? findTag(args, 'execution-device')) ||
  luaProcessesByConnection.get(deps)?.has(args.process) === true

const getData = (args) => args.data ?? '1984'

const getMessageId = (response, parsedResponse) =>
  parsedResponse.id ??
  parsedResponse.messageId ??
  parsedResponse.message?.id ??
  response.headers?.get?.('id') ??
  response.headers?.get?.('message')

const getMessageResponse = ({ response, parsedResponse, returnAssignmentSlot, returnMessageId }) => {
  const slot = parsedResponse.slot

  if (returnMessageId) {
    const id = getMessageId(response, parsedResponse)
    if (!id) throw new Error('Message id not found in response')
    if (returnAssignmentSlot) return { slot, id }
    return id
  }

  return slot
}

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

/**
 * @typedef MainnetSpawnArgs
 * @property {string} [module] - an Arweave transaction ID containing the process module
 * @property {string | Uint8Array | ArrayBuffer} [data] - inline Lua source when using the Lua execution device
 * @property {'genesis-wasm@1.0' | 'lua@5.3' | 'lua@5.3a'} [executionDevice]
 * @property {'genesis-wasm' | 'hyper-aos'} [type] - deprecated execution device alias
 * @property {string} [authority]
 * @property {{ name: string, value: string }[]} [tags]
 *
 * @param {any} deps
 * @returns {(args: MainnetSpawnArgs) => Promise<string>}
 */
export function spawnWith(deps) {
  return async (args) => {
    let scheduler = deps.scheduler

    if (!scheduler && deps.url) {
      const schedulerRes = await fetch(`${deps.url}/~meta@1.0/info/address`)
      scheduler = await schedulerRes.text()
    }

    const module = process.env.MODULE || args.module
    const taggedExecutionDevice = findTag(args, 'execution-device')
    const executionDevice = getExecutionDevice(args, taggedExecutionDevice)
    const luaProcess = executionDevice === LUA_EXECUTION_DEVICE
    const tags = getTags(args, luaProcess)
    const inlineLua = executionDevice === LUA_EXECUTION_DEVICE && !module && args.data != null

    if (!scheduler) throw new Error('No scheduler provided')
    if (!module && !inlineLua) {
      throw new Error(
        executionDevice === LUA_EXECUTION_DEVICE
          ? 'No module or inline Lua source provided'
          : 'No module provided'
      )
    }

    const authority = process.env.AUTHORITY || args.authority || scheduler

    for (const name of Object.keys(tags)) {
      if (name.toLowerCase() === 'execution-device') delete tags[name]
      if (inlineLua && name.toLowerCase() === 'content-type') delete tags[name]
    }

    if (inlineLua) {
      tags[luaProcess ? 'content-type' : 'Content-Type'] = 'application/lua'
    }

    debugLog('info', 'Node URL:', deps.url)
    debugLog('info', 'Scheduler:', scheduler)
    debugLog('info', 'Authority:', authority)
    debugLog('info', 'Module:', module)
    debugLog('info', 'Execution Device:', executionDevice)

    try {
      const params = {
        path: '/push',
        device: 'process@1.0',
        'scheduler-device': 'scheduler@1.0',
        'push-device': 'push@1.0',
        [luaProcess ? 'authority' : 'Authority']: authority,
        [luaProcess ? 'scheduler' : 'Scheduler']: scheduler,
        ...(module ? { [luaProcess ? 'module' : 'Module']: module } : {}),
        data: getData(args),
        ...tags,
        'execution-device': executionDevice,
        ...getAOParams('Process', luaProcess),
        ...httpParams
      }

      const response = await deps.aoCore.request(params)

      try {
        const processId = response.headers.get('process')
        debugLog('info', 'Process ID:', processId)

        if (processId) {
          if (luaProcess) rememberLuaProcess(deps, processId)
          return processId
        }
        else throw new Error('Error spawning process')
      } catch (e) {
        throw new Error(e.message ?? 'Error spawning process')
      }
    } catch (e) {
      throw new Error(e.message ?? 'Error spawning process')
    }
  }
}

export function messageWith(deps) {
  return async (args) => {
    try {
      const luaMessage = isLuaMessage(deps, args)
      const params = {
        path: `/${args.process}~process@1.0/push`,
        target: args.process,
        data: getData(args),
        ...getTags(args, luaMessage),
        ...getAOParams('Message', luaMessage),
        ...jsonParams,
      }

      const response = await deps.aoCore.request(params)
      if (response.ok) {
        const parsedResponse = await response.json()

        if (args.opts?.fullResponse) return normalizeOutput(parsedResponse)
        else {
          return getMessageResponse({
            response,
            parsedResponse,
            returnAssignmentSlot: args.returnAssignmentSlot,
            returnMessageId: args.returnMessageId
          })
        }
      }
      else throw new Error('Error sending message')
    } catch (e) {
      throw new Error(e.message ?? 'Error sending message')
    }
  }
}

export function resultWith(deps) {
  return async (args) => {
    try {
      const params = {
        path: `/${args.process}~process@1.0/compute=${args.slot ?? args.message}/results`,
        target: args.process,
        data: getData(args),
        ...getTags(args),
        ...jsonParams
      }
      const response = await deps.aoCore.request(params)
      if (response.ok) {
        const parsedResponse = await response.json()
        return normalizeOutput(parsedResponse)
      }
      else throw new Error('Error getting result')
    } catch (e) {
      throw new Error(e.message ?? 'Error getting result')
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
            path: `/${args.process}/compute=${currentSlot}/results`,
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
                    ...normalizeOutput(parsedResultsResponse)
                  }
                }
              ]
            }
          }

          else throw new Error('Error getting results')
        } catch (e) {
          throw new Error(e.message ?? 'Error getting current process slot')
        }
      }
      else throw new Error('Error getting results')
    } catch (e) {
      throw new Error(e.message ?? 'Error getting results')
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
        return normalizeOutput(parsedResponse)
      }
      else throw new Error('Error running dryrun')
    } catch (e) {
      throw new Error(e.message ?? 'Error running dryrun')
    }
  }
}

async function _retryInitPush(deps, processId, maxAttempts = 10) {
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
