/**
 * @jest-environment node
 */

const { Crypto } = require("../src/npm-node.js");

describe('(node) web crypto', () => {
    it('crypto API is defined', () => {
        expect(Crypto).toBeDefined();
        expect(typeof Crypto.getRandomValues).toBe('function');
        expect(typeof Crypto.randomUUID).toBe('function');
        expect(typeof Crypto.subtle).toBe('object');
    });

    it('randomUUID', () => {
        expect(Crypto.randomUUID()).toBeDefined();
    });

    it('getRandomValues', () => {
        expect(Crypto.getRandomValues(new Uint8Array(5))).toBeDefined();
    });
});
