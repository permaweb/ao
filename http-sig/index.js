import { createHash, createPrivateKey, createPublicKey, verify, constants, sign } from 'node:crypto';
import { randomBytes } from 'crypto';
import { httpbis } from 'http-message-signatures';
import Arweave from 'arweave';
const { signMessage, verifyMessage } = httpbis;

// Initialize Arweave
const arweave = Arweave.init({
    host: 'arweave.net',
    port: 443,
    protocol: 'https',
});

// Generate a random secret key for HMAC
const secretKey = randomBytes(32).toString('hex');
console.log('Generated Secret Key:', secretKey);

console.log(constants)

// Create a function to generate different signers
async function createSigner(alg) {
    if (alg === 'hmac-sha256') {
        return {
            id: 'hmac-key-id',
            alg: 'hmac-sha256',
            async sign(data) {
                const key = await crypto.subtle.importKey(
                    'raw',
                    Buffer.from(secretKey),
                    { name: 'HMAC', hash: 'SHA-256' },
                    true,
                    ['sign', 'verify']
                );
                return Buffer.from(await crypto.subtle.sign('HMAC', key, data));
            },
        };
    } else if (alg === 'rsa-pss-sha512') {
        const jwk = await arweave.wallets.generate();

        const privateKeyPem = convertJWKToPEM(jwk, 'private');
        const publicKeyPem = convertJWKToPEM(jwk, 'public');

        return {
            id: 'arweave-key-id',
            alg: 'rsa-pss-sha512',
            async sign(data) {
                const privateKey = createPrivateKey(privateKeyPem);
                return sign(
                    'sha512',
                    data,
                    {
                        key: privateKey,
                        padding: constants.RSA_PKCS1_PSS_PADDING,
                        saltLength: 64,
                    },
                );
            },
            pubKey: publicKeyPem, // Store public key for verification
        };
    }
    throw new Error(`Unsupported algorithm: ${alg}`);
}

// Create a function to generate verifiers
async function createVerifier(alg, publicKeyPem) {
    if (alg === 'hmac-sha256') {
        return async (data, signature) => {
            const key = await crypto.subtle.importKey(
                'raw',
                Buffer.from(secretKey),
                { name: 'HMAC', hash: 'SHA-256' },
                true,
                ['sign', 'verify']
            );
            return crypto.subtle.verify('HMAC', key, signature, data);
        };
    } else if (alg === 'rsa-pss-sha512' && publicKeyPem) {
        return async (data, signature) => {
            const publicKey = createPublicKey(publicKeyPem);
            return verify(
                'sha512',
                signature,
                { key: publicKey, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 64 },
                data
            );
        };
    }
    throw new Error(`Unsupported algorithm: ${alg}`);
}

// Convert JWK to PEM format
function convertJWKToPEM(jwk, type) {
    if (!jwk.n || !jwk.e) throw new Error('Invalid JWK format.');
    return type === 'private'
        ? createPrivateKey({ key: jwk, format: 'jwk' }).export({ type: 'pkcs8', format: 'pem' })
        : createPublicKey({ key: jwk, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
}

async function signAndVerifyRequest(alg) {
    try {
        const signer = await createSigner(alg);
        const verifier = await createVerifier(alg, signer.pubKey);

        const request = {
            method: 'POST',
            url: 'https://example.com',
            headers: {
                'content-type': 'application/json',
                'content-digest': 'sha-512=:YMAam51Jz/jOATT6/zvHrLVgOYTGFy1d6GJiOHTohq4yP+pgk4vf2aCsyRZOtw8MjkM7iw7yZ/WkppmM44T3qg==:',
                'content-length': '19',
            },
            body: '{"hello": "world"}\n',
        };

        // Sign the request
        const signedRequest = await signMessage({ key: signer }, request);
        console.log('Signed Request:', signedRequest);

        // Keystore for verification
        const keys = new Map();
        keys.set(signer.id, {
            id: signer.id,
            algs: [alg],
            verify: verifier,
        });

        // Simulate received request for verification
        const receivedRequest = {
            ...request,
            headers: {
                ...signedRequest.headers,
            },
        };

        // Verify the signed request
        const verified = await verifyMessage(
            {
                async keyLookup(params) {
                    return keys.get(params.keyid);
                },
            },
            receivedRequest
        );

        console.log(`Verification result for ${alg}:`, verified ? 'Valid' : 'Invalid');
    } catch (error) {
        console.error(`Error for ${alg}:`, error);
    }
}

signAndVerifyRequest('hmac-sha256');
signAndVerifyRequest('rsa-pss-sha512');