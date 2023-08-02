/* eslint-disable */
import Arweave from 'arweave';
import fs from 'fs';
import path from 'path';
import { JWKInterface } from 'arweave/node/lib/wallet';
import { DeployPlugin, ArweaveSigner, EthereumSigner } from 'warp-contracts-plugin-deploy';
import { defaultCacheOptions, LoggerFactory, Tag, WarpFactory, WARP_TAGS } from 'warp-contracts';

async function main() {
    let wallet: JWKInterface = readJSON('.secrets/jwk.json');
    LoggerFactory.INST.logLevel('error');
    //LoggerFactory.INST.logLevel('debug', 'ExecutionContext');
    const logger = LoggerFactory.INST.create('deploy');

    const arweave = Arweave.init({
        host: 'arweave.net',
        port: 443,
        protocol: 'https',
    });

    try {
        const warp = WarpFactory.forMainnet({ ...defaultCacheOptions, inMemory: true }).use(new DeployPlugin());

        const jsContractSrc = fs.readFileSync(path.join(__dirname, './data/token-pst.js'), 'utf8');
        const wasmContractSrc = fs.readFileSync(path.join(__dirname, './data/rust/rust-pst_bg.wasm'));
        const walletAddress = await warp.arweave.wallets.jwkToAddress(wallet);
        const initialState = {
            ticker: 'EXAMPLE_PST_TOKEN',
            owner: 'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M',
            canEvolve: true,
            balances: {
                'uhE-QeYS8i4pmUtnxQyHD7dzXFNaJ9oMK-IM-QPNY6M': 10000000,
                '33F0QHcb22W7LwWR1iRC8Az1ntZG09XQ03YWuw2ABqA': 23111222,
                [walletAddress]: 1000000,
            },
            wallets: {},
        };

        // init state in Tag
        // init state tx id in Tag
        // init state in data
        // js src 
        // wasm src
        // case 1 - full deploy, js contract
        let d = await warp.deploy({
            wallet: wallet,
            initState: JSON.stringify(initialState),
            src: jsContractSrc,
        }, true);

        console.log(`contractType=JS initState=data contractTxId=${d.contractTxId} srcTxId=${d.srcTxId}`);


        d = await warp.deploy({
            wallet: wallet,
            initState: JSON.stringify(initialState),
            src: wasmContractSrc,
            wasmSrcCodeDir: path.join(__dirname, './data/rust/src'),
            wasmGlueCode: path.join(__dirname, './data/rust/rust-pst.js'),
        }, true);
        console.log(`contractType=WASM initState=data contractTxId=${d.contractTxId} srcTxId=${d.srcTxId}`);

        d = await warp.deploy({
            wallet: wallet,
            initState: JSON.stringify(initialState),
            src: jsContractSrc,
            data: {
                'Content-Type': 'image/svg',
                body: "image/png;base64,FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF",
            },
        }, true);
        console.log(`contractType=JS initState=tag contractTxId=${d.contractTxId} srcTxId=${d.srcTxId}`);


        const { contractTxId, srcTxId } = await warp.deploy({
            wallet: wallet,
            initState: JSON.stringify(initialState),
            src: jsContractSrc,
            tags: [
                { name: WARP_TAGS.INIT_STATE_TX, value: d.srcTxId || '' },
            ]
        }, true);
        console.log(`contractType=JS initState=tx in tag contractTxId=${d.contractTxId} srcTxId=${d.srcTxId}`);

    } catch (e) {
        //logger.error(e)
        throw e;
    }
}

export function readJSON(path: string): JWKInterface {
    const content = fs.readFileSync(path, 'utf-8');
    try {
        return JSON.parse(content);
    } catch (e) {
        throw new Error(`File "${path}" does not contain a valid JSON`);
    }
}

main().catch((e) => console.error(e));
