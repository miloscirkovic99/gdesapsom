const { clientAddress, networkKey, parseIPv6 } = require('../../lib/planner/ip');

describe('networkKey', () => {
  it('keeps an IPv4 address as it is', () => {
    expect(networkKey('203.0.113.7')).toBe('203.0.113.7');
  });

  it('reduces IPv6 to its /64', () => {
    expect(networkKey('2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1:2::/64');
    expect(networkKey('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64');
  });

  it('puts every address of one /64 under the same key, and the next /64 under another', () => {
    const a = networkKey('2a02:2f0e:1:9::1');
    const b = networkKey('2a02:2f0e:1:9:dead:beef:0:42');
    const c = networkKey('2a02:2f0e:1:a::1');
    expect(a).toBe(b);
    expect(c).not.toBe(a);
  });

  it('understands "::" anywhere, upper case, brackets and a zone id', () => {
    expect(networkKey('::1')).toBe('0:0:0:0::/64');
    expect(networkKey('2001:DB8::')).toBe('2001:db8:0:0::/64');
    expect(networkKey('[2001:db8:5:6::7]')).toBe('2001:db8:5:6::/64');
    expect(networkKey('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
  });

  it('counts an IPv4-mapped IPv6 address as the IPv4 address', () => {
    expect(networkKey('::ffff:198.51.100.4')).toBe('198.51.100.4');
  });

  it('rejects things that are not addresses', () => {
    for (const bad of ['', 'localhost', '256.1.1.1', '1.2.3', '2001:db8::1::2', '2001:db8:1:2:3:4:5:6:7', 'gggg::1', null]) {
      expect(networkKey(bad)).toBeNull();
    }
    expect(parseIPv6('1:2:3:4:5:6:7')).toBeNull();
  });
});

describe('clientAddress', () => {
  const headers = (map) => (name) => map[name];

  it('takes the entry our proxy appended, never the first one the client can forge', () => {
    const get = headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' });
    expect(clientAddress(get, { trustedHops: 1 })).toBe('203.0.113.7');
  });

  it('with two trusted proxies, takes the second entry from the right', () => {
    const get = headers({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7, 10.0.0.2' });
    expect(clientAddress(get, { trustedHops: 2 })).toBe('203.0.113.7');
  });

  it('falls back to the socket address when the header is missing, short or garbage', () => {
    expect(clientAddress(headers({}), { trustedHops: 1, remoteAddress: '198.51.100.1' })).toBe('198.51.100.1');
    expect(clientAddress(headers({ 'x-forwarded-for': '203.0.113.7' }), { trustedHops: 2, remoteAddress: '198.51.100.1' })).toBe('198.51.100.1');
    expect(clientAddress(headers({ 'x-forwarded-for': '1.1.1.1, nonsense' }), { trustedHops: 1, remoteAddress: null })).toBeNull();
  });

  it('reads a single-value header set by the edge when configured', () => {
    const get = headers({ 'cf-connecting-ip': '2001:db8:1:2::9', 'x-forwarded-for': '6.6.6.6' });
    expect(clientAddress(get, { header: 'CF-Connecting-IP' })).toBe('2001:db8:1:2::9');
  });
});
