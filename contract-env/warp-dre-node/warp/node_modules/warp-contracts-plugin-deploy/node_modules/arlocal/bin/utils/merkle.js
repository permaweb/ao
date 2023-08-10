"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.debug = exports.validatePath = exports.arrayCompare = exports.bufferToInt = exports.intToBuffer = exports.arrayFlatten = exports.generateProofs = exports.buildLayers = exports.generateTransactionChunks = exports.generateTree = exports.computeRootHash = exports.generateLeaves = exports.chunkData = exports.MIN_CHUNK_SIZE = exports.MAX_CHUNK_SIZE = void 0;
/**
 * @see {@link https://github.com/ArweaveTeam/arweave/blob/fbc381e0e36efffa45d13f2faa6199d3766edaa2/apps/arweave/src/ar_merkle.erl}
 * This is taken from https://github.com/ArweaveTeam/arweave-js with few tweaks.
 */
const encoding_1 = require("./encoding");
const utils_1 = require("./utils");
exports.MAX_CHUNK_SIZE = 256 * 1024;
exports.MIN_CHUNK_SIZE = 32 * 1024;
const NOTE_SIZE = 32;
const HASH_SIZE = 32;
/**
 * Takes the input data and chunks it into (mostly) equal sized chunks.
 * The last chunk will be a bit smaller as it contains the remainder
 * from the chunking process.
 */
function chunkData(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const chunks = [];
        let rest = data;
        let cursor = 0;
        while (rest.byteLength >= exports.MAX_CHUNK_SIZE) {
            let chunkSize = exports.MAX_CHUNK_SIZE;
            // If the total bytes left will produce a chunk < MIN_CHUNK_SIZE,
            // then adjust the amount we put in this 2nd last chunk.
            const nextChunkSize = rest.byteLength - exports.MAX_CHUNK_SIZE;
            if (nextChunkSize > 0 && nextChunkSize < exports.MIN_CHUNK_SIZE) {
                chunkSize = Math.ceil(rest.byteLength / 2);
                // console.log(`Last chunk will be: ${nextChunkSize} which is below ${MIN_CHUNK_SIZE}, adjusting current to ${chunkSize} with ${rest.byteLength} left.`)
            }
            const chunk = rest.slice(0, chunkSize);
            const dataHash = yield (0, encoding_1.cryptoHash)(chunk);
            cursor += chunk.byteLength;
            chunks.push({
                dataHash,
                minByteRange: cursor - chunk.byteLength,
                maxByteRange: cursor,
            });
            rest = rest.slice(chunkSize);
        }
        chunks.push({
            dataHash: yield (0, encoding_1.cryptoHash)(rest),
            minByteRange: cursor,
            maxByteRange: cursor + rest.byteLength,
        });
        return chunks;
    });
}
exports.chunkData = chunkData;
function generateLeaves(chunks) {
    return __awaiter(this, void 0, void 0, function* () {
        return Promise.all(chunks.map(({ dataHash, minByteRange, maxByteRange }) => __awaiter(this, void 0, void 0, function* () {
            return {
                type: 'leaf',
                id: yield hash(yield Promise.all([hash(dataHash), hash(intToBuffer(maxByteRange))])),
                dataHash,
                minByteRange,
                maxByteRange,
            };
        })));
    });
}
exports.generateLeaves = generateLeaves;
/**
 * Builds an arweave merkle tree and gets the root hash for the given input.
 */
function computeRootHash(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootNode = yield generateTree(data);
        return rootNode.id;
    });
}
exports.computeRootHash = computeRootHash;
function generateTree(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const rootNode = yield buildLayers(yield generateLeaves(yield chunkData(data)));
        return rootNode;
    });
}
exports.generateTree = generateTree;
/**
 * Generates the data_root, chunks & proofs
 * needed for a transaction.
 *
 * This also checks if the last chunk is a zero-length
 * chunk and discards that chunk and proof if so.
 * (we do not need to upload this zero length chunk)
 *
 * @param data
 */
function generateTransactionChunks(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const chunks = yield chunkData(data);
        const leaves = yield generateLeaves(chunks);
        const root = yield buildLayers(leaves);
        const proofs = yield generateProofs(root);
        // Discard the last chunk & proof if it's zero length.
        const lastChunk = chunks.slice(-1)[0];
        if (lastChunk.maxByteRange - lastChunk.minByteRange === 0) {
            chunks.splice(chunks.length - 1, 1);
            proofs.splice(proofs.length - 1, 1);
        }
        return {
            data_root: root.id,
            chunks,
            proofs,
        };
    });
}
exports.generateTransactionChunks = generateTransactionChunks;
/**
 * Starting with the bottom layer of leaf nodes, hash every second pair
 * into a new branch node, push those branch nodes onto a new layer,
 * and then recurse, building up the tree to it's root, where the
 * layer only consists of two items.
 */
function buildLayers(nodes, level = 0) {
    return __awaiter(this, void 0, void 0, function* () {
        // If there is only 1 node left, this is going to be the root node
        if (nodes.length < 2) {
            const root = nodes[0];
            // console.log("Root layer", root);
            return root;
        }
        const nextLayer = [];
        for (let i = 0; i < nodes.length; i += 2) {
            nextLayer.push(yield hashBranch(nodes[i], nodes[i + 1]));
        }
        // console.log("Layer", nextLayer);
        return buildLayers(nextLayer, level + 1);
    });
}
exports.buildLayers = buildLayers;
/**
 * Recursively search through all branches of the tree,
 * and generate a proof for each leaf node.
 */
function generateProofs(root) {
    const proofs = resolveBranchProofs(root);
    if (!Array.isArray(proofs)) {
        return [proofs];
    }
    return arrayFlatten(proofs);
}
exports.generateProofs = generateProofs;
function resolveBranchProofs(node, proof = new Uint8Array(), depth = 0) {
    if (node.type === 'leaf') {
        return {
            offset: node.maxByteRange - 1,
            proof: (0, utils_1.concatBuffers)([proof, node.dataHash, intToBuffer(node.maxByteRange)]),
        };
    }
    if (node.type === 'branch') {
        const partialProof = (0, utils_1.concatBuffers)([proof, node.leftChild.id, node.rightChild.id, intToBuffer(node.byteRange)]);
        return [
            resolveBranchProofs(node.leftChild, partialProof, depth + 1),
            resolveBranchProofs(node.rightChild, partialProof, depth + 1),
        ];
    }
    throw new Error(`Unexpected node type`);
}
function arrayFlatten(input) {
    const flat = [];
    input.forEach((item) => {
        if (Array.isArray(item)) {
            flat.push(...arrayFlatten(item));
        }
        else {
            flat.push(item);
        }
    });
    return flat;
}
exports.arrayFlatten = arrayFlatten;
function hashBranch(left, right) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!right) {
            return left;
        }
        const branch = {
            type: 'branch',
            id: yield hash([yield hash(left.id), yield hash(right.id), yield hash(intToBuffer(left.maxByteRange))]),
            byteRange: left.maxByteRange,
            maxByteRange: right.maxByteRange,
            leftChild: left,
            rightChild: right,
        };
        return branch;
    });
}
function hash(data) {
    return __awaiter(this, void 0, void 0, function* () {
        if (Array.isArray(data)) {
            data = (0, utils_1.concatBuffers)(data);
        }
        return new Uint8Array(yield (0, encoding_1.cryptoHash)(data));
    });
}
function intToBuffer(note) {
    const buffer = new Uint8Array(NOTE_SIZE);
    for (let i = buffer.length - 1; i >= 0; i--) {
        const byte = note % 256;
        buffer[i] = byte;
        note = (note - byte) / 256;
    }
    return buffer;
}
exports.intToBuffer = intToBuffer;
function bufferToInt(buffer) {
    let value = 0;
    for (const buf of buffer) {
        value *= 256;
        value += buf;
    }
    return value;
}
exports.bufferToInt = bufferToInt;
const arrayCompare = (a, b) => a.every((value, index) => b[index] === value);
exports.arrayCompare = arrayCompare;
function validatePath(id, dest, leftBound, rightBound, path) {
    return __awaiter(this, void 0, void 0, function* () {
        if (rightBound <= 0) {
            return false;
        }
        if (dest >= rightBound) {
            return validatePath(id, 0, rightBound - 1, rightBound, path);
        }
        if (dest < 0) {
            return validatePath(id, 0, 0, rightBound, path);
        }
        if (path.length === HASH_SIZE + NOTE_SIZE) {
            const pathData = path.slice(0, HASH_SIZE);
            const endOffsetBuffer = path.slice(pathData.length, pathData.length + NOTE_SIZE);
            const pathDataHash = yield hash([yield hash(pathData), yield hash(endOffsetBuffer)]);
            const result = (0, exports.arrayCompare)(id, pathDataHash);
            if (result) {
                return {
                    offset: rightBound - 1,
                    leftBound,
                    rightBound,
                    chunkSize: rightBound - leftBound,
                };
            }
            return false;
        }
        const left = path.slice(0, HASH_SIZE);
        const right = path.slice(left.length, left.length + HASH_SIZE);
        const offsetBuffer = path.slice(left.length + right.length, left.length + right.length + NOTE_SIZE);
        const offset = bufferToInt(offsetBuffer);
        const remainder = path.slice(left.length + right.length + offsetBuffer.length);
        const pathHash = yield hash([yield hash(left), yield hash(right), yield hash(offsetBuffer)]);
        if ((0, exports.arrayCompare)(id, pathHash)) {
            if (dest < offset) {
                return yield validatePath(left, dest, leftBound, Math.min(rightBound, offset), remainder);
            }
            return yield validatePath(right, dest, Math.max(leftBound, offset), rightBound, remainder);
        }
        return false;
    });
}
exports.validatePath = validatePath;
/**
 * Inspect an arweave chunk proof.
 * Takes proof, parses, reads and displays the values for console logging.
 * One proof section per line
 * Format: left,right,offset => hash
 */
function debug(proof, output = '') {
    return __awaiter(this, void 0, void 0, function* () {
        if (proof.byteLength < 1) {
            return output;
        }
        const left = proof.slice(0, HASH_SIZE);
        const right = proof.slice(left.length, left.length + HASH_SIZE);
        const offsetBuffer = proof.slice(left.length + right.length, left.length + right.length + NOTE_SIZE);
        const offset = bufferToInt(offsetBuffer);
        const remainder = proof.slice(left.length + right.length + offsetBuffer.length);
        const pathHash = yield hash([yield hash(left), yield hash(right), yield hash(offsetBuffer)]);
        const updatedOutput = `${output}\n${JSON.stringify(Buffer.from(left))},${JSON.stringify(Buffer.from(right))},${offset} => ${JSON.stringify(pathHash)}`;
        return debug(remainder, updatedOutput);
    });
}
exports.debug = debug;
//# sourceMappingURL=merkle.js.map