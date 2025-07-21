function convertToLegacyOutput (res) {
  let body = {}
  try {
    body = JSON.parse(JSON.parse(res?.body)?.results?.json?.body)
  } catch (_) {}
  return {
    Output: body?.Output || {},
    Messages: body?.Messages || [],
    Assignments: body?.Assignments || [],
    Spawns: body?.Spawns || [],
    Error: body?.Error
  }
}

export function messageWith(deps) {
    return async (args) => {
        try {
            const params = {
                path: `/${args.process}~process@1.0/push/serialize~json@1.0`,
                method: 'POST',
                type: 'Message',
                'data-protocol': 'ao',
                variant: 'ao.N.1',
                target: args.process,
                'signingFormat': 'ANS-104',
                data: args.data ?? '1234',
                'accept-bundle': 'true',
                'accept-codec': 'httpsig@1.0',
                ...(args.tags ? Object.fromEntries(args.tags.map(tag => [tag.name, tag.value])) : {})
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
                method: 'POST',
                type: 'Message',
                'data-protocol': 'ao',
                variant: 'ao.N.1',
                target: args.process,
                'signingFormat': 'ANS-104',
                data: args.data ?? '1234',
                'accept-bundle': 'true',
                'accept-codec': 'httpsig@1.0',
                'slot': args.slot ?? args.message,
                ...(args.tags ? Object.fromEntries(args.tags.map(tag => [tag.name, tag.value])) : {})
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

export function spawnWith(deps) {
    return async (args) => {
        let scheduler = process.env.SCHEDULER;
        if (!scheduler && deps.url) {
            const schedulerRes = await fetch(`${deps.url}/~meta@1.0/info/address`);
            scheduler = await schedulerRes.text();
        }
        else throw new Error('No scheduler provided');

        const authority = process.env.AUTHORITY || scheduler;
        const module = process.env.MODULE || 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s';

        try {
            const params = {
                path: '/push',
                method: 'POST',
                device: 'process@1.0',
                scheduler: scheduler,
                'scheduler-location': scheduler,
                'scheduler-device': 'scheduler@1.0',
                'push-device': 'push@1.0',
                'data-protocol': 'ao',
                variant: 'ao.N.1',
                'Authority': authority,
                'accept-bundle': 'true',
                'signingFormat': 'ANS-104',
                'execution-device': 'genesis-wasm@1.0',
                Module: module,
                Type: 'Process',
                ...(args.tags ? Object.fromEntries(args.tags.map(tag => [tag.name, tag.value])) : {})
            }

            const response = await deps.aoCore.request(params);
            if (response.ok) return response.headers.get('process');
            return null;
        }
        catch (e) {
            throw new Error(e.message ?? 'Error spawning mainnet process');
        }
    }
}