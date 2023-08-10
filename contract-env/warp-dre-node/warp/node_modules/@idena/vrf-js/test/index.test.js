const assert = require('assert');
const elliptic = require('elliptic');
const { Evaluate, ProofHoHash } = require('..');

const EC = new elliptic.ec('secp256k1');

describe('VRF', () => {
  it('full test vrf', () => {
    const key = EC.genKeyPair();
    const m1 = [123, 32, 123, 66, 0, 10];
    const m2 = [1, 2, 3, 4, 5];
    const m3 = [1, 2, 3, 4, 5];

    const [index1, proof1] = Evaluate(key.getPrivate().toArray(), m1);
    const [index2, proof2] = Evaluate(key.getPrivate().toArray(), m2);
    const [index3, proof3] = Evaluate(key.getPrivate().toArray(), m3);

    const cases = [
      { m: m1, index: index1, proof: proof1, err: false },
      { m: m2, index: index2, proof: proof2, err: false },
      { m: m3, index: index3, proof: proof3, err: false },
      { m: m3, index: index3, proof: proof2, err: false },
      { m: m3, index: index3, proof: proof1, err: true },
    ];

    cases.forEach((c, i) => {
      let err = false;
      let index;
      try {
        index = ProofHoHash(key.getPublic(), c.m, c.proof);
      } catch (e) {
        err = true;
      }
      assert.strictEqual(err, c.err, 'error mismatch, i=' + i);
      if (err) {
        return;
      }
      assert.deepStrictEqual(index, c.index, 'index mismatch');
    });
  });
});
