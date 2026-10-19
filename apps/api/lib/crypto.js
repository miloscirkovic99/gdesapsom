/**
 * SHA-256, HMAC-SHA256 and random ids in plain JavaScript.
 *
 * The planner hashes every device id and network before it touches the
 * database (HMAC-SHA256 under PLANNER_HMAC_SECRET) and keys its cache by
 * SHA-256. MARS Engine's own crypto helpers are not documented anywhere this
 * code could check, so these do not depend on them; the tests compare them
 * with Node's crypto.
 */

const K = [
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01,
  0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
  0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
  0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08,
  0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

/** UTF-8 bytes of a string. */
function utf8Bytes(text) {
  const bytes = [];
  for (let i = 0; i < text.length; i++) {
    let code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const low = text.charCodeAt(i + 1);
      if (low >= 0xdc00 && low <= 0xdfff) {
        code = 0x10000 + ((code - 0xd800) << 10) + (low - 0xdc00);
        i++;
      }
    }
    if (code < 0x80) bytes.push(code);
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 63));
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 63), 0x80 | ((code >> 6) & 63), 0x80 | (code & 63));
  }
  return bytes;
}

/** SHA-256 of a byte array, as a 32-byte array. */
function sha256Bytes(message) {
  const bytes = message.slice();
  const bitLength = message.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let shift = 56; shift >= 0; shift -= 8) bytes.push(shift >= 32 ? Math.floor(bitLength / 2 ** shift) & 255 : (bitLength >>> shift) & 255);

  const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
  const w = new Array(64);
  const rotr = (x, n) => (x >>> n) | (x << (32 - n));

  for (let offset = 0; offset < bytes.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      const j = offset + i * 4;
      w[i] = ((bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3]) >>> 0;
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 = (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] = (h[0] + a) >>> 0;
    h[1] = (h[1] + b) >>> 0;
    h[2] = (h[2] + c) >>> 0;
    h[3] = (h[3] + d) >>> 0;
    h[4] = (h[4] + e) >>> 0;
    h[5] = (h[5] + f) >>> 0;
    h[6] = (h[6] + g) >>> 0;
    h[7] = (h[7] + hh) >>> 0;
  }

  const out = [];
  for (const word of h) out.push(word >>> 24, (word >>> 16) & 255, (word >>> 8) & 255, word & 255);
  return out;
}

const toHex = (bytes) => bytes.map((b) => b.toString(16).padStart(2, '0')).join('');

/** SHA-256 of the UTF-8 text, 64 hex characters. */
function sha256Hex(text) {
  return toHex(sha256Bytes(utf8Bytes(String(text))));
}

/** HMAC-SHA256 (RFC 2104) of the UTF-8 message under the UTF-8 key, 64 hex characters. */
function hmacSha256Hex(key, message) {
  let keyBytes = utf8Bytes(String(key));
  if (keyBytes.length > 64) keyBytes = sha256Bytes(keyBytes);
  while (keyBytes.length < 64) keyBytes.push(0);
  const inner = sha256Bytes(keyBytes.map((b) => b ^ 0x36).concat(utf8Bytes(String(message))));
  return toHex(sha256Bytes(keyBytes.map((b) => b ^ 0x5c).concat(inner)));
}

/**
 * Random bytes from the platform's secure generator when there is one
 * (`crypto.getRandomValues`), else Math.random. Used for plan ids and the
 * device cookie, which identify but protect nothing.
 */
function randomBytes(count, source) {
  const generator = source !== undefined ? source : typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (generator && typeof generator.getRandomValues === 'function') {
    return Array.from(generator.getRandomValues(new Uint8Array(count)));
  }
  const bytes = [];
  for (let i = 0; i < count; i++) bytes.push(Math.floor(Math.random() * 256));
  return bytes;
}

const ID_ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/** A 16-character [0-9a-z] id (about 82 bits), e.g. for /plan/:id. */
function randomId(length = 16, source) {
  // 252 is the largest multiple of 36 below 256: rejection keeps the letters uniform.
  const out = [];
  while (out.length < length) {
    for (const byte of randomBytes(length * 2, source)) {
      if (byte < 252 && out.length < length) out.push(ID_ALPHABET[byte % 36]);
    }
  }
  return out.join('');
}

/** RFC 4122 version 4 UUID. */
function uuidV4(source) {
  const b = randomBytes(16, source);
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const hex = toHex(b);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

module.exports = { sha256Hex, hmacSha256Hex, randomId, uuidV4, utf8Bytes };
