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
                'signingFormat': 'ans104',
                data: args.data ?? '1234',
                'accept-bundle': 'true',
                'accept-codec': 'httpsig@1.0',
                ...(args.tags ? Object.fromEntries(args.tags.map(tag => [tag.name, tag.value])) : {})
            }

            const response = await deps.aoCore.request(params);
            if (response.ok) return await response.json();
            return null;
        }
        catch (e) {
            throw new Error(e.message ?? 'Error sending mainnet message');
        }
    }
}

export function spawnWith(deps) {
    return async (args) => {
        const SCHEDULER = process.env.SCHEDULER || 'nKVqLQN6g_bU5xhHPyW-ZSf4EiHTbRu-z_Rpk3j2MtQ';
        const AUTHORITY = process.env.AUTHORITY || SCHEDULER;
        const MODULE = process.env.MODULE || 'ISShJH1ij-hPPt9St5UFFr_8Ys3Kj5cyg7zrMGt7H9s';

        try {
            const params = {
                path: '/push',
                method: 'POST',
                Type: 'Process',
                scheduler: SCHEDULER,
                device: 'process@1.0',
                'scheduler-device': 'scheduler@1.0',
                'push-device': 'push@1.0',
                'scheduler-location': SCHEDULER,
                'data-protocol': 'ao',
                variant: 'ao.N.1',
                'Authority': AUTHORITY,
                'accept-bundle': 'true',
                'signingFormat': 'ans104',
                Module: MODULE,
                'execution-device': 'genesis-wasm@1.0',
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