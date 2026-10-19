/**
 * Which address a request comes from, and the network it is counted under.
 *
 * Only the hash of the network key is stored (PLANNER_HMAC_SECRET), never the
 * address itself. IPv6 is counted per /64: one home or phone usually gets a
 * whole /64, and counting single addresses would let it rotate past the limit.
 */

function parseIPv4(value) {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  return parts.every((part) => part <= 255) ? parts : null;
}

/** Eight 16-bit groups, or null. Accepts "::", an embedded IPv4 tail, brackets and a zone id. */
function parseIPv6(value) {
  let text = String(value).trim().toLowerCase();
  if (text.startsWith('[') && text.endsWith(']')) text = text.slice(1, -1);
  text = text.split('%')[0];
  if (!text.includes(':')) return null;

  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    if (!v4) return null;
    text = `${text.slice(0, lastColon + 1)}${((v4[0] << 8) | v4[1]).toString(16)}:${((v4[2] << 8) | v4[3]).toString(16)}`;
  }

  const halves = text.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const missing = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : missing < 1) return null;

  const groups = [...head, ...new Array(halves.length === 2 ? missing : 0).fill('0'), ...rest];
  if (groups.length !== 8 || !groups.every((group) => /^[0-9a-f]{1,4}$/.test(group))) return null;
  return groups.map((group) => parseInt(group, 16));
}

/**
 * "203.0.113.7" for IPv4 (and IPv4-mapped IPv6), "2001:db8:1:2::/64" for
 * IPv6, null for anything that is not an address.
 */
function networkKey(address) {
  if (address == null) return null;
  const text = String(address).trim();

  const v4 = parseIPv4(text);
  if (v4) return v4.join('.');

  const v6 = parseIPv6(text);
  if (!v6) return null;

  const isMapped = v6.slice(0, 5).every((group) => group === 0) && v6[5] === 0xffff;
  if (isMapped) return [v6[6] >> 8, v6[6] & 255, v6[7] >> 8, v6[7] & 255].join('.');

  return `${v6
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(':')}::/64`;
}

/**
 * The client address as the trusted proxies saw it.
 *
 * `X-Forwarded-For` is "client, proxy1, proxy2": every proxy appends the
 * address it received the request from, and anything to the left of what our
 * own proxies wrote can be typed by the client. So the entry written by the
 * outermost trusted proxy is the one `trustedHops` from the right, never the
 * first one. With a single-value header set by the edge (e.g. a CDN's
 * client-IP header) `header` names it and `trustedHops` is ignored.
 *
 * @param {(name: string) => string | null | undefined} getHeader
 * @param {{ header?: string, trustedHops?: number, remoteAddress?: string | null }} options
 */
function clientAddress(getHeader, options) {
  const header = (options.header || 'x-forwarded-for').toLowerCase();
  const raw = getHeader(header);

  if (header !== 'x-forwarded-for') {
    return raw && networkKey(raw) ? String(raw).trim() : options.remoteAddress || null;
  }

  const hops = Math.max(1, options.trustedHops || 1);
  const entries = String(raw || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length < hops) return options.remoteAddress || null;

  const candidate = entries[entries.length - hops];
  return networkKey(candidate) ? candidate : options.remoteAddress || null;
}

module.exports = { parseIPv4, parseIPv6, networkKey, clientAddress };
