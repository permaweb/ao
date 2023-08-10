const elliptic = require('elliptic');
const BN = require('bn.js');
const { sha256 } = require('js-sha256');
const { sha512 } = require('js-sha512');

const EC = new elliptic.ec('secp256k1');

function toBytesInt32(num) {
  return new Uint8Array([
    (num & 0xff000000) >> 24,
    (num & 0x00ff0000) >> 16,
    (num & 0x0000ff00) >> 8,
    num & 0x000000ff,
  ]);
}

const one = new BN(1);

function Unmarshal(data) {
  const byteLen = (EC.n.bitLength() + 7) >> 3;
  EC.g.mul(10);
  if ((data[0] & ~1) != 2) {
    return [null, null];
  }
  if (data.length != 1 + byteLen) return [null, null];

  const tx = new BN(data.slice(1, 1 + byteLen));
  try {
    const p = EC.curve.pointFromX(tx);
    return [p.x, p.y];
  } catch (e) {
    return [null, null];
  }
}

/**
 * @param {number[] | Uint8Array} m data
 * @returns {elliptic.curve.base.BasePoint} point
 */
function H1(m) {
  let x = null,
    y = null;
  const byteLen = (EC.n.bitLength() + 7) >> 3;
  let i = 0;
  while (x == null && i < 100) {
    const res = sha512.array(new Uint8Array([...toBytesInt32(i), ...m]));
    const r = [2, ...res];
    [x, y] = Unmarshal(r.slice(0, byteLen + 1));
    i++;
  }
  return EC.curve.point(x, y);
}

/**
 * @param {number[] | Uint8Array} m data
 * @returns {BN} BN
 */
function H2(m) {
  const byteLen = (EC.n.bitLength() + 7) >> 3;
  let i = 0;
  while (true) {
    const res = sha512.array(new Uint8Array([...toBytesInt32(i), ...m]));
    const k = new BN(res.slice(0, byteLen));

    if (k.cmp(EC.curve.n.sub(one)) == -1) {
      return k.add(one);
    }

    i++;
  }
}

/**
 * @param {number[] | Uint8Array} privateKey private key
 * @param {number[] | Uint8Array} m data
 * @returns {[Uint8Array, Uint8Array]} index, proof
 */
function Evaluate(privateKey, m) {
  const currentKey = EC.keyFromPrivate(privateKey);

  const r = EC.genKeyPair();
  const rBN = r.getPrivate();

  // H = H1(m)
  const pointH = H1(m);

  // VRF_k(m) = [k]H
  const point = pointH.mul(privateKey);

  // vrf 65 bytes
  const vrf = point.encode();

  const rgPoint = EC.curve.g.mul(rBN);
  const rhPoint = pointH.mul(rBN);

  const b = [
    ...EC.curve.g.encode(),
    ...pointH.encode(),
    ...currentKey.getPublic().encode(),
    ...vrf,
    ...rgPoint.encode(),
    ...rhPoint.encode(),
  ];

  const s = H2(b);

  const t = rBN.sub(s.mul(currentKey.getPrivate())).umod(EC.curve.n);

  const index = sha256.array(new Uint8Array(vrf));

  const buf = [
    ...new Array(32 - s.byteLength()).fill(0),
    ...s.toArray(),
    ...new Array(32 - t.byteLength()).fill(0),
    ...t.toArray(),
    ...vrf,
  ];

  return [index, buf];
}

/**
 * @param {number[] | Uint8Array} publicKey public key
 * @param {number[] | Uint8Array} data data
 * @param {number[] | Uint8Array} proof VRF proof
 * @returns {Uint8Array} index
 * @throws Will throw if VRF proof is invalid
 */
function ProofHoHash(publicKey, data, proof) {
  const currentKey = EC.keyFromPublic(publicKey);
  if (proof.length !== 64 + 65) {
    throw new Error('invalid vrf');
  }
  const s = proof.slice(0, 32);
  const t = proof.slice(32, 64);
  const vrf = proof.slice(64, 64 + 65);

  const uhPoint = decodePoint(vrf);
  if (!uhPoint) {
    throw new Error('invalid vrf');
  }

  // [t]G + [s]([k]G) = [t+ks]G
  const tgPoint = EC.curve.g.mul(t);
  const ksgPoint = currentKey.getPublic().mul(s);
  const tksgPoint = tgPoint.add(ksgPoint);

  // H = H1(m)
  // [t]H + [s]VRF = [t+ks]H
  const hPoint = H1(data);
  const thPoint = hPoint.mul(t);
  const shPoint = uhPoint.mul(s);
  const tkshPoint = thPoint.add(shPoint);

  const b = [
    ...EC.curve.g.encode(),
    ...hPoint.encode(),
    ...currentKey.getPublic().encode(),
    ...vrf,
    ...tksgPoint.encode(),
    ...tkshPoint.encode(),
  ];

  const h2 = H2(b);

  const buf = [...new Array(32 - h2.byteLength()).fill(0), ...h2.toArray()];

  let equal = true;
  for (let i = 0; i < buf.length; i++) {
    if (s[i] !== buf[i]) {
      equal = false;
    }
  }
  if (!equal) {
    throw new Error('invalid vrf');
  }

  return sha256.array(new Uint8Array(vrf));
}

/**
 * @param {number[] | Uint8Array} data point data
 * @returns {elliptic.curve.base.BasePoint} point
 */
function decodePoint(data) {
  try {
    return EC.curve.decodePoint(data);
  } catch {
    return null;
  }
}

module.exports = {
  Evaluate,
  ProofHoHash,
};
