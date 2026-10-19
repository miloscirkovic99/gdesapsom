const nodeCrypto = require('crypto');
const { hmacSha256Hex, randomId, sha256Hex, uuidV4 } = require('../lib/crypto');
const { isUuidV4 } = require('../lib/planner/limits');

const nodeSha = (text) => nodeCrypto.createHash('sha256').update(text, 'utf8').digest('hex');
const nodeHmac = (key, text) => nodeCrypto.createHmac('sha256', key).update(text, 'utf8').digest('hex');

describe('pure JS SHA-256 and HMAC-SHA256', () => {
  const samples = ['', 'abc', 'Žućko šeta po Kopaoniku 🐕', 'a'.repeat(55), 'a'.repeat(56), 'a'.repeat(64), 'x'.repeat(1000)];

  it('matches Node for empty, multi-block, non-ASCII and emoji input', () => {
    for (const text of samples) expect(sha256Hex(text)).toBe(nodeSha(text));
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('matches Node HMAC, with short and over-long keys', () => {
    for (const key of ['k', 'tajna-planera', 'ključ'.repeat(30)]) {
      for (const text of samples) expect(hmacSha256Hex(key, text)).toBe(nodeHmac(key, text));
    }
  });
});

describe('random ids', () => {
  it('plan ids are 16 characters of [0-9a-z] and do not repeat', () => {
    const ids = new Set(Array.from({ length: 500 }, () => randomId()));
    expect(ids.size).toBe(500);
    for (const id of ids) expect(id).toMatch(/^[0-9a-z]{16}$/);
  });

  it('device ids are UUID v4, with or without a secure generator', () => {
    expect(isUuidV4(uuidV4())).toBe(true);
    expect(isUuidV4(uuidV4(null))).toBe(true); // Math.random fallback
  });
});
