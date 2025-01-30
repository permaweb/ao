import { createHash, createPrivateKey, createPublicKey } from 'node:crypto';
import { httpbis, createSigner, createVerifier } from 'http-message-signatures';
import Arweave from 'arweave';
import fs from 'fs';

const { signMessage, verifyMessage } = httpbis;

// Initialize Arweave
const arweave = Arweave.init({});

async function generateArweaveSigner() {
    // Generate an Arweave wallet (JWK format)
    const jwk = await arweave.wallets.generate();
    const address = arweave.wallets.getAddress(jwk);

    // Convert JWK to PEM format first
    const privateKeyPem = convertJWKToPEM(jwk, 'private');
    const publicKeyPem = convertJWKToPEM(jwk, 'public');

    // Convert PEM to DER format
    const privateKeyDer = convertPEMToDER(privateKeyPem);
    const publicKeyDer = convertPEMToDER(publicKeyPem);

    return {
        signer: createSigner(createPrivateKey({ key: jwk, format: 'jwk' }), 'rsa-pss-sha512', address),
        pubKeyDER: publicKeyDer, // Store as DER
    };
}

// Convert JWK to PEM (Ensures all values are strings)
function convertJWKToPEM(jwk, type) {
    if (!jwk.n || !jwk.e) throw new Error('Invalid JWK format.');

    const key = {
        kty: 'RSA',
        n: Buffer.from(jwk.n, 'base64').toString('base64'), // Ensure string
        e: Buffer.from(jwk.e, 'base64').toString('base64'), // Ensure string
        d: type === 'private' ? Buffer.from(jwk.d, 'base64').toString('base64') : undefined,
        p: type === 'private' ? Buffer.from(jwk.p, 'base64').toString('base64') : undefined,
        q: type === 'private' ? Buffer.from(jwk.q, 'base64').toString('base64') : undefined,
        dp: type === 'private' ? Buffer.from(jwk.dp, 'base64').toString('base64') : undefined,
        dq: type === 'private' ? Buffer.from(jwk.dq, 'base64').toString('base64') : undefined,
        qi: type === 'private' ? Buffer.from(jwk.qi, 'base64').toString('base64') : undefined,
    };

    return type === 'private'
        ? createPrivateKey({ key, format: 'jwk' }).export({ type: 'pkcs8', format: 'pem' })
        : createPublicKey({ key, format: 'jwk' }).export({ type: 'spki', format: 'pem' });
}

// Convert PEM to DER format
function convertPEMToDER(pemKey) {
    const pemContents = pemKey
        .replace(/-----BEGIN .* KEY-----/, '')
        .replace(/-----END .* KEY-----/, '')
        .replace(/\n/g, '');
    
    return Buffer.from(pemContents, 'base64'); // Convert Base64 PEM to binary DER
}

async function signAndVerifyRequest() {
    try {
        const arweaveSigner = await generateArweaveSigner();

        // HTTP request object
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

        // Sign the request using Arweave private key in DER format
        const signedRequest = await signMessage({ key: arweaveSigner.signer }, request);
        console.log('Signed Request:', signedRequest);

        // Create a verifier using the Arweave public key in DER format
        const verifier = createVerifier(arweaveSigner.signer, 'rsa-pss-sha512');

        // Keystore for verification
        const keys = new Map();
        keys.set('arweave-key-id', {
            id: 'arweave-key-id',
            algs: ['rsa-pss-sha512'],
            verify: verifier,
        });

        // Simulate received request for verification (copy signed headers)
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

        console.log('Verification Result:', verified ? '✅ Valid Signature' : '❌ Invalid Signature');
    } catch (error) {
        console.error('Error:', error);
    }
}

// Execute the function
signAndVerifyRequest();