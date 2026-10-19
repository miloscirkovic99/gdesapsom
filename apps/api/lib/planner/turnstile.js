/**
 * Cloudflare Turnstile server-side check (Siteverify API).
 *
 * Every token is checked here before a plan request spends anything: the
 * widget alone proves nothing, a token is valid for 300 s and only once.
 * The visitor's IP is not sent along (`remoteip` is optional), so it leaves
 * the server only as an HMAC.
 */
const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/** Tokens are at most 2048 characters. */
const MAX_TOKEN_LENGTH = 2048;

function isTokenShaped(token) {
  return typeof token === 'string' && token.length > 0 && token.length <= MAX_TOKEN_LENGTH;
}

function siteverifyRequest(secret, token) {
  return {
    method: 'POST',
    url: SITEVERIFY_URL,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
  };
}

/** @returns {{ ok: boolean, errors: string[] }} */
function parseSiteverify(status, body) {
  if (status !== 200) return { ok: false, errors: [`http_${status}`] };
  try {
    const data = JSON.parse(body);
    return { ok: data.success === true, errors: Array.isArray(data['error-codes']) ? data['error-codes'].map(String) : [] };
  } catch {
    return { ok: false, errors: ['bad_json'] };
  }
}

module.exports = { siteverifyRequest, parseSiteverify, isTokenShaped, SITEVERIFY_URL };
