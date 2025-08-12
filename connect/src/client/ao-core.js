import { debugLog } from '../logger.js';

function convertToLegacyOutput(jsonRes) {
    let body = {}
    try {
        body = JSON.parse(jsonRes?.results?.json?.body);
        debugLog('info', 'HyperBEAM Response Body:', body);
    } catch (_) { }

    debugLog('info', 'Parsed HyperBEAM Response Body:', body);

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
    'method': 'POST',
    'signing-format': 'ans104',
    'accept-bundle': 'true',
    'accept-codec': 'httpsig@1.0',
}

const getAOParams = (type) => ({
    'Type': type,
    'Data-Protocol': 'ao',
    'Variant': 'ao.N.1'
});

const getTags = (args) =>
    args.tags
        ? Object.fromEntries(args.tags.map(tag => [tag.name, tag.value]))
        : {};

const getData = (args) => args.data ?? '1984';

export function messageWith(deps) {
    return async (args) => {
        try {
            const params = {
                path: `/${args.process}~process@1.0/push/serialize~json@1.0`,
                target: args.process,
                data: getData(args),
                ...getTags(args),
                ...getAOParams('Message'),
                ...baseParams,
            }

            const response = await deps.aoCore.request(params);
            if (response.ok) {
                const parsedResponse = await response.json();

                if (args.opts?.fullResponse) return convertToLegacyOutput(parsedResponse);
                else return parsedResponse.slot;
            }
            return null;
        }
        catch (e) {
            throw new Error(e.message ?? 'Error sending mainnet message');
        }
    }
}

export function resultWith(deps) {
    return async (args) => {
        try {
            const params = {
                path: `/${args.process}~process@1.0/compute/serialize~json@1.0`,
                target: args.process,
                slot: args.slot ?? args.message,
                data: getData(args),
                ...getTags(args),
                ...baseParams,
            }

            const response = await deps.aoCore.request(params);
            if (response.ok) {
                const parsedResponse = await response.json();
                return convertToLegacyOutput(parsedResponse);
            }
            return null;
        }
        catch (e) {
            throw new Error(e.message ?? 'Error sending mainnet message');
        }
    }
}

export function resultsWith(deps) {
    return async (args) => {
        try {
            const slotParams = {
                path: `/${args.process}~process@1.0/slot/current/body/serialize~json@1.0`,
                ...baseParams
            }

            const slotResponse = await deps.aoCore.request(slotParams);
            if (slotResponse.ok) {
                const parsedSlotResponse = await slotResponse.json();

                try {
                    const currentSlot = parsedSlotResponse.body;

                    const resultsParams = {
                        path: `/${args.process}~process@1.0/compute&slot=${currentSlot}/serialize~json@1.0`,
                        ...baseParams
                    }

                    const resultsResponse = await deps.aoCore.request(resultsParams);
                    if (resultsResponse.ok) {
                        const parsedResultsResponse = await resultsResponse.json();
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

                    return null;

                }
                catch (e) {
                    throw new Error(e.message ?? 'Error getting current process slot');
                }
            }
            return null;
        }
        catch (e) {
            throw new Error(e.message ?? 'Error sending mainnet message');
        }
    }
}

export function spawnWith(deps) {
    return async (args) => {
        let scheduler = deps.scheduler;

        if (!scheduler && deps.url) {
            const schedulerRes = await fetch(`${deps.url}/~meta@1.0/info/address`);
            scheduler = await schedulerRes.text();
        }

        if (!scheduler) throw new Error('No scheduler provided');

        const authority = process.env.AUTHORITY || scheduler;
        const module = process.env.MODULE || 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s';

        debugLog('info', 'Node URL:', deps.url);
        debugLog('info', 'Scheduler:', scheduler);
        debugLog('info', 'Authority:', authority);
        debugLog('info', 'Module:', module);

        try {
            const params = {
                'path': '/push',
                'device': 'process@1.0',
                'scheduler': scheduler,
                'scheduler-location': scheduler,
                'scheduler-device': 'scheduler@1.0',
                'push-device': 'push@1.0',
                'execution-device': 'genesis-wasm@1.0',
                'Authority': authority,
                'Module': module,
                'data': getData(args),
                ...getTags(args),
                ...getAOParams('Process'),
                ...baseParams,
            }

            const response = await deps.aoCore.request(params);

            try {
                const processId = response.headers.get('process');

                debugLog('info', 'Process ID:', processId);

                await retryInitPush(deps, args, processId);

                return processId;
            }
            catch (e) {
                throw new Error(e.message ?? 'Error spawning mainnet process');
            }
        }
        catch (e) {
            throw new Error(e.message ?? 'Error spawning mainnet process');
        }
    }
}

async function retryInitPush(deps, args, processId, maxAttempts = 10) {
    const params = {
        path: `/${processId}~process@1.0/push/serialize~json@1.0`,
        target: processId,
        Action: 'Eval',
        data: `require('.process')._version`,
        ...getTags(args),
        ...getAOParams('Message'),
        ...baseParams,
    };

    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            const initPush = await deps.aoCore.request(params);
            if (initPush.ok) {
                debugLog('info', `Init push succeeded on attempt ${attempt}`);
                return initPush;
            } else {
                debugLog('warn', `Init push attempt ${attempt} returned ok=false`, {
                    status: initPush.status,
                    body: initPush,
                });
                lastError = new Error(`Init push returned ok=false (status=${initPush.status})`);
            }
        } catch (err) {
            debugLog('warn', `Init push attempt ${attempt} threw`, err);
            lastError = err;
        }

        if (attempt === maxAttempts) break;

        await new Promise((r) => setTimeout(r, 500));
    }

    throw new Error(`Init push failed after ${maxAttempts} attempts: ${lastError?.message || 'unknown'}`);
}