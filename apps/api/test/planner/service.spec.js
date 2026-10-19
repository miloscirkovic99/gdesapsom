/**
 * The planner endpoints end to end against a real MariaDB (test/support/mariadb.js):
 * SQL, quota, cache, cascade and privacy rules together. Skipped without a
 * database server.
 */
const { hmacSha256Hex, randomId, sha256Hex, uuidV4 } = require('../../lib/crypto');
const { createCooldowns, createPlannerService } = require('../../lib/planner/service');
const systemPrompt = require('../../lib/planner/system-prompt');
const { createTestDatabase, mariadbAvailable } = require('../support/mariadb');
const { createFakeHttp } = require('../support/fake-world');

const describeDb = mariadbAvailable() ? describe : describe.skip;

const NOW = Date.parse('2026-11-20T09:00:00Z'); // Friday 10:00 in Belgrade
const IP = '203.0.113.7';
const ENV = {
  PLANNER_HMAC_SECRET: 'test-secret-that-is-long-enough-1234567890',
  TURNSTILE_SECRET_KEY: 'turnstile-secret',
  GEMINI_API_KEY: 'gemini-key',
  CF_ACCOUNT_ID: 'cf-account',
  CF_AI_API_TOKEN: 'cf-token',
  ANTHROPIC_API_KEY: 'anthropic-key',
  MET_NO_USER_AGENT: 'gdesapsom.com test',
  PLANNER_DAILY_BUDGET_USD: '0.30',
};

const DAN = {
  mode: 'dan',
  grad: 'beograd',
  datum: '2026-11-21',
  velicina: 'srednji',
  energija: 'srednja',
  osetljiv_na_vrucinu: false,
  tip_dana: 'mesovit',
  turnstile_token: 'ok-token',
};

const ZIMA = {
  mode: 'zimovanje',
  destinacija: 'kopaonik',
  broj_noci: 3,
  velicina: 'srednji',
  dlaka: 'kratka',
  neko_skija: true,
  pas_sme_sam: false,
  turnstile_token: 'ok-token',
};

describeDb('planner service on MariaDB', () => {
  let database;
  let world;

  beforeAll(() => {
    database = createTestDatabase();
  });
  afterAll(() => database && database.drop());

  beforeEach(() => {
    for (const table of ['planner_feedback', 'planner_quota', 'planner_plans', 'planner_weather_cache']) database.db.query(`DELETE FROM ${table}`);
    const fake = createFakeHttp();
    fake.state.forecastDates = ['2026-11-20', '2026-11-21', '2026-11-22'];
    world = { clock: { t: NOW }, fake, env: { ...ENV }, cooldowns: createCooldowns() };
  });

  const service = () =>
    createPlannerService({
      db: database.db,
      env: (name) => (Object.prototype.hasOwnProperty.call(world.env, name) ? world.env[name] : null),
      http: world.fake.http,
      now: () => world.clock.t,
      randomId: () => randomId(),
      uuidV4: () => uuidV4(),
      sha256Hex,
      hmacSha256Hex,
      systemPrompt,
      cooldowns: world.cooldowns,
    });

  const request = ({ input = {}, device = null, ip = IP, headers = {} } = {}) => ({
    input,
    cookie: (name) => (name === 'gsp_device' ? device : null),
    header: (name) => headers[name.toLowerCase()] ?? null,
    remoteAddress: ip,
  });

  /** Moves the clock past the 10 s cooldown. */
  const later = (seconds = 11) => {
    world.clock.t += seconds * 1000;
  };

  const rows = (sql, ...args) => database.db.query(sql, ...args);
  const providerCalls = () => world.fake.state.calls.filter((call) => /googleapis|cloudflare.com\/client|anthropic/.test(call.url));

  describe('POST planner', () => {
    it('makes a "dan" plan from database places only, and sets the device cookie', () => {
      const res = service().create(request({ input: { ...DAN, ime: 'Žućko' } }));

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ mode: 'dan', source: 'ai', remaining: 2, next_at: null });
      expect(res.body.plan_id).toMatch(/^[0-9a-z]{16}$/);
      expect(res.body.weather_attribution).toMatchObject({ url: 'https://api.met.no/', license: 'CC BY 4.0' });

      const ids = res.body.plan.stanice.map((stop) => String(stop.lokacija_id));
      expect(ids.length).toBeGreaterThanOrEqual(3);
      for (const id of ids) expect(res.body.places[id]).toMatchObject({ id: Number(id) });
      expect(Object.keys(res.body.places).sort()).toEqual([...new Set(ids)].sort());

      expect(res.cookies).toEqual([{ name: 'gsp_device', value: expect.stringMatching(/^[0-9a-f-]{36}$/), maxAge: 365 * 24 * 60 * 60 }]);
      expect(rows('SELECT provider, mode FROM planner_plans')).toEqual([{ provider: 'gemini', mode: 'dan' }]);
    });

    it('stores only HMACs of the device and network, never the dog name or a raw id', () => {
      const res = service().create(request({ input: { ...DAN, ime: 'Žućko' } }));
      const deviceId = res.cookies[0].value;

      const quota = rows('SELECT device_hash, ip_hash, plan_id FROM planner_quota');
      expect(quota).toEqual([{ device_hash: expect.stringMatching(/^[0-9a-f]{64}$/), ip_hash: expect.stringMatching(/^[0-9a-f]{64}$/), plan_id: res.body.plan_id }]);

      const everything = JSON.stringify([rows('SELECT * FROM planner_quota'), rows('SELECT * FROM planner_plans'), rows('SELECT * FROM planner_weather_cache')]);
      for (const secret of [IP, deviceId, 'Žućko', 'ok-token']) expect(everything).not.toContain(secret);
      expect(Object.keys(JSON.parse(rows('SELECT params FROM planner_plans')[0].params)).sort()).toEqual(
        ['datum', 'energija', 'grad', 'mode', 'osetljiv_na_vrucinu', 'tip_dana', 'velicina'],
      );
      // No value was ever written into the SQL text itself.
      for (const sql of database.db.statements) for (const value of [IP, deviceId, quota[0].device_hash, res.body.plan_id, 'Beograd']) expect(sql).not.toContain(value);
    });

    it('rejects anything outside the whitelist before spending anything', () => {
      const res = service().create(request({ input: { ...DAN, velicina: 'ogroman', datum: '2027-01-01' } }));
      expect(res).toEqual({ status: 400, body: { reason: 'invalid', fields: ['velicina', 'datum'] } });
      expect(world.fake.state.calls).toHaveLength(0);
      expect(rows('SELECT COUNT(*) AS n FROM planner_quota')).toEqual([{ n: '0' }]);
    });

    it('requires a valid Turnstile token and reserves nothing without one', () => {
      expect(service().create(request({ input: { ...DAN, turnstile_token: 'forged' } }))).toEqual({ status: 403, body: { reason: 'captcha' } });
      later();
      expect(service().create(request({ input: { ...DAN, turnstile_token: undefined } }))).toEqual({ status: 403, body: { reason: 'captcha' } });
      expect(rows('SELECT COUNT(*) AS n FROM planner_quota')).toEqual([{ n: '0' }]);
      expect(providerCalls()).toHaveLength(0);
    });

    it('allows one request per network in 10 s, from memory or from the database', () => {
      expect(service().create(request({ input: DAN })).status).toBe(200);
      later(4);
      expect(service().create(request({ input: DAN, ip: IP }))).toEqual({
        status: 429,
        body: { reason: 'cooldown', next_at: new Date(world.clock.t + 6000).toISOString(), retry_after: 6 },
      });
      // A fresh process has no memory of the first request; the quota table still has it.
      world.cooldowns = createCooldowns();
      expect(service().create(request({ input: DAN })).body.reason).toBe('cooldown');
      later(7);
      expect(service().create(request({ input: DAN })).status).toBe(200);
    });

    it('allows 3 plans per device in 7 days, then 429 "device" with the time of the next free slot', () => {
      const first = service().create(request({ input: DAN }));
      const device = first.cookies[0].value;
      const firstAt = world.clock.t;
      const zlatibor = { ...ZIMA, destinacija: 'zlatibor' };
      for (const input of [{ ...DAN, tip_dana: 'aktivan' }, ZIMA]) {
        later();
        expect(service().create(request({ input, device }))).toMatchObject({ status: 200 });
      }
      later();
      const refused = service().create(request({ input: zlatibor, device }));
      expect(refused).toEqual({ status: 429, body: { reason: 'device', next_at: new Date(firstAt + 7 * 24 * 3600 * 1000).toISOString() } });
      expect(rows('SELECT COUNT(*) AS n FROM planner_quota')).toEqual([{ n: '3' }]);
    });

    it('reports the last plan of the week with remaining 0 and next_at', () => {
      const first = service().create(request({ input: DAN }));
      const device = first.cookies[0].value;
      later();
      service().create(request({ input: { ...DAN, tip_dana: 'aktivan' }, device }));
      later();
      const third = service().create(request({ input: ZIMA, device }));
      expect(third.body).toMatchObject({ remaining: 0, next_at: new Date(NOW + 7 * 24 * 3600 * 1000).toISOString() });
    });

    it('allows 15 plans per network, whatever the devices, then 429 "network"', () => {
      const tips = ['opusten', 'aktivan', 'mesovit'];
      for (let i = 0; i < 15; i++) {
        later();
        const input = { ...DAN, tip_dana: tips[i % 3], energija: ['niska', 'srednja', 'visoka'][Math.floor(i / 3) % 3], osetljiv_na_vrucinu: i >= 9 };
        expect(service().create(request({ input })).status).toBe(200);
      }
      later();
      const refused = service().create(request({ input: DAN }));
      expect(refused.status).toBe(429);
      expect(refused.body.reason).toBe('network');
      expect(refused.cookies).toHaveLength(1); // a new device, but the network is full
    });

    it('counts an IPv6 /64 as one network', () => {
      service().create(request({ input: DAN, ip: '2001:db8:1:2::10' }));
      later(3);
      expect(service().create(request({ input: DAN, ip: '2001:db8:1:2:aaaa::99' })).body.reason).toBe('cooldown');
      expect(service().create(request({ input: DAN, ip: '2001:db8:1:3::10' })).status).toBe(200);
    });

    it('takes the client address the trusted proxy wrote, never the first X-Forwarded-For entry', () => {
      world.env.PLANNER_TRUSTED_HOPS = '1';
      service().create(request({ input: DAN, ip: '10.0.0.1', headers: { 'x-forwarded-for': '198.51.100.1, 203.0.113.50' } }));
      later(3);
      // Same real client, a different forged first entry: still the same network.
      expect(service().create(request({ input: DAN, ip: '10.0.0.1', headers: { 'x-forwarded-for': '192.0.2.99, 203.0.113.50' } })).body.reason).toBe('cooldown');
    });

    it('reuses a plan younger than 24 h for the same parameters and weather, and still counts it', () => {
      const first = service().create(request({ input: DAN }));
      later();
      const again = service().create(request({ input: DAN, ip: '198.51.100.20' }));
      expect(again.body.plan_id).toBe(first.body.plan_id);
      expect(again.body.remaining).toBe(2);
      expect(providerCalls()).toHaveLength(1);
      expect(rows('SELECT plan_id FROM planner_quota ORDER BY id')).toEqual([{ plan_id: first.body.plan_id }, { plan_id: first.body.plan_id }]);

      world.clock.t = NOW + 25 * 3600 * 1000;
      const dayLater = service().create(request({ input: { ...DAN, datum: '2026-11-22' }, ip: '198.51.100.30' }));
      expect(dayLater.body.plan_id).not.toBe(first.body.plan_id);
    });

    it('treats 5 °C of forecast difference as different parameters', () => {
      const first = service().create(request({ input: DAN }));
      world.fake.state.metTemp = 25;
      rows('DELETE FROM planner_weather_cache');
      later();
      const warmer = service().create(request({ input: DAN, ip: '198.51.100.20' }));
      expect(warmer.body.plan_id).not.toBe(first.body.plan_id);
    });

    it('asks MET Norway once per point while its answer is fresh, with the User-Agent', () => {
      service().create(request({ input: DAN }));
      later();
      service().create(request({ input: { ...DAN, tip_dana: 'aktivan' }, ip: '198.51.100.20' }));
      const met = world.fake.state.calls.filter((call) => call.url.startsWith('https://api.met.no/'));
      expect(met).toHaveLength(1);
      expect(met[0].url).toBe('https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=44.8125&lon=20.4612');
      expect(met[0].headers['User-Agent']).toBe('gdesapsom.com test');
    });

    it('plans without a forecast when MET Norway fails, and says nothing about weather', () => {
      world.fake.state.met = 'error';
      const res = service().create(request({ input: DAN }));
      expect(res.status).toBe(200);
      expect(res.body.weather_attribution).toBeNull();
    });

    it('falls through the cascade: Gemini down → Gemma; a plan with an unknown place is rejected', () => {
      world.fake.state.behaviour = { gemini: 'error', cloudflare: 'unknown_id', anthropic: 'ok' };
      const res = service().create(request({ input: DAN }));
      expect(res.body.source).toBe('ai');
      expect(rows('SELECT provider, model, tokens_in, tokens_out, cost_usd FROM planner_plans')).toEqual([
        // Gemma's rejected answer is paid for too: Gemma 0.0001 + 0.00006, Haiku 0.0001 + 0.0001 (1000 in, 200 out each).
        { provider: 'anthropic', model: 'claude-haiku-5-5', tokens_in: '2000', tokens_out: '400', cost_usd: '0.000360' },
      ]);
      const attempts = JSON.parse(rows('SELECT result FROM planner_plans')[0].result).attempts.map((a) => a.outcome);
      expect(attempts).toEqual(['http_error', 'invalid', 'ok']);
    });

    it('skips Haiku once today has spent the budget, and falls back to the rules plan', () => {
      world.fake.state.behaviour = { gemini: 'throw', cloudflare: 'error', anthropic: 'ok' };
      rows(
        "INSERT INTO planner_plans (id, params_hash, params, result, mode, provider, cost_usd, created_at) VALUES ('spentspentspent1', ?, '{}', '{}', 'dan', 'gemini', 0.300000, ?)",
        'x'.repeat(64),
        '2026-11-20 07:00:00',
      );
      const res = service().create(request({ input: DAN }));
      expect(res.body.source).toBe('rules');
      expect(providerCalls().map((call) => call.url.split('/')[2])).toEqual(['generativelanguage.googleapis.com', 'api.cloudflare.com']);
    });

    it('builds the rules plan when no provider is configured at all', () => {
      for (const key of ['GEMINI_API_KEY', 'CF_ACCOUNT_ID', 'ANTHROPIC_API_KEY']) delete world.env[key];
      const res = service().create(request({ input: DAN }));
      expect(res.body.source).toBe('rules');
      expect(res.body.plan.stanice.length).toBeGreaterThanOrEqual(3);
      expect(providerCalls()).toHaveLength(0);
    });

    it('gives the reservation back when the plan cannot be saved', () => {
      const original = database.db.query;
      database.db.query = (sql, ...args) => {
        if (sql.includes('INSERT INTO planner_plans')) throw new Error('disk full');
        return original.call(database.db, sql, ...args);
      };
      try {
        const res = service().create(request({ input: DAN }));
        expect(res.status).toBe(503);
        expect(res.cookies).toHaveLength(1);
      } finally {
        database.db.query = original;
      }
      expect(rows('SELECT COUNT(*) AS n FROM planner_quota')).toEqual([{ n: '0' }]);
    });

    it('answers 503 without the HMAC secret, before anything is stored', () => {
      world.env.PLANNER_HMAC_SECRET = 'short';
      expect(service().create(request({ input: DAN }))).toEqual({ status: 503, body: { reason: 'unavailable' } });
      expect(world.fake.state.calls).toHaveLength(0);
    });

    it('makes a "zimovanje" plan with stays, the nearest vet within 100 km and stay details from the database', () => {
      const res = service().create(request({ input: ZIMA }));
      expect(res.status).toBe(200);
      const { plan, places } = res.body;
      expect(plan.smestaj.map((s) => s.lokacija_id).sort()).toEqual([101, 105]);
      expect(plan.veterinar_id).toBe(2000001);
      expect(places['101']).toEqual(
        expect.objectContaining({ url: '/spots/101', affiliate_url: 'https://partner.example/101', doplata_za_psa: { amount: 10, currency: 'EUR', per: 'noc' }, max_pasa: 2, pas_sme_sam_u_sobi: true }),
      );
      expect(places['105']).toEqual(expect.objectContaining({ affiliate_url: null, doplata_za_psa: null, max_pasa: null, pas_sme_sam_u_sobi: false }));
      expect(places['2000001']).toEqual(expect.objectContaining({ url: null, telefon: '036 000 000' }));
      expect(res.body.weather_attribution).toBeNull();
    });

    it('answers 503 "no_places" and frees the slot when the database cannot fill a plan', () => {
      const res = service().create(request({ input: { ...ZIMA, destinacija: 'tara' } }));
      expect(res.body).toEqual({ reason: 'no_places' });
      expect(res.status).toBe(503);
      expect(providerCalls()).toHaveLength(0);
      expect(rows('SELECT COUNT(*) AS n FROM planner_quota')).toEqual([{ n: '0' }]);
    });
  });

  describe('GET plan/:id', () => {
    it('returns the saved plan with its places as they are now, without quota fields', () => {
      const made = service().create(request({ input: DAN }));
      const res = service().get(request({ input: { id: made.body.plan_id } }));
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ...made.body, remaining: undefined, next_at: undefined });
      expect(res.body).not.toHaveProperty('remaining');
    });

    it('drops a place deleted after the plan was made', () => {
      const made = service().create(request({ input: DAN }));
      const victim = made.body.plan.stanice.find((stop) => stop.lokacija_id < 1000000);
      rows("UPDATE info_ug_obj SET iuo_obrisan = '2026-11-20 10:00:00' WHERE iuo_id = ?", victim.lokacija_id);
      try {
        const res = service().get(request({ input: { id: made.body.plan_id } }));
        expect(res.body.places[String(victim.lokacija_id)]).toBeUndefined();
      } finally {
        rows('UPDATE info_ug_obj SET iuo_obrisan = NULL WHERE iuo_id = ?', victim.lokacija_id);
      }
    });

    it('404 for an unknown or malformed id', () => {
      expect(service().get(request({ input: { id: 'aaaaaaaaaaaaaaaa' } })).status).toBe(404);
      expect(service().get(request({ input: { id: "x' OR 1=1 --" } })).status).toBe(404);
    });
  });

  describe('POST swap', () => {
    it('replaces one stop with another database place and saves it as a new plan', () => {
      const made = service().create(request({ input: DAN }));
      const before = made.body.plan.stanice.map((stop) => stop.lokacija_id);
      const index = made.body.plan.stanice.findIndex((stop) => stop.lokacija_id >= 1000000);

      const res = service().swap(request({ input: { plan_id: made.body.plan_id, index } }));
      expect(res.status).toBe(200);
      expect(res.body.plan_id).not.toBe(made.body.plan_id);
      const after = res.body.plan.stanice.map((stop) => stop.lokacija_id);
      expect(after[index]).not.toBe(before[index]);
      expect(after.filter((_, i) => i !== index)).toEqual(before.filter((_, i) => i !== index));
      expect(res.body.places[String(after[index])]).toBeDefined();

      // The original link still shows the original plan.
      expect(service().get(request({ input: { id: made.body.plan_id } })).body.plan.stanice.map((s) => s.lokacija_id)).toEqual(before);
      expect(rows('SELECT provider, cost_usd FROM planner_plans WHERE id = ?', res.body.plan_id)).toEqual([{ provider: 'swap', cost_usd: '0.000000' }]);
      expect(rows('SELECT COUNT(*) AS n FROM planner_quota')).toEqual([{ n: '1' }]);
    });

    it('answers 409 when every alternative was already offered', () => {
      const made = service().create(request({ input: ZIMA }));
      const res = service().swap(request({ input: { plan_id: made.body.plan_id, section: 'smestaj', index: 0 } }));
      expect(res).toEqual({ status: 409, body: { reason: 'no_alternative' } });
    });

    it('rejects a bad target', () => {
      expect(service().swap(request({ input: { plan_id: 'nope', index: 0 } })).status).toBe(400);
      expect(service().swap(request({ input: { plan_id: 'aaaaaaaaaaaaaaaa', index: 'x' } })).status).toBe(400);
      expect(service().swap(request({ input: { plan_id: 'aaaaaaaaaaaaaaaa', index: 0 } })).status).toBe(404);
    });
  });

  describe('POST feedback', () => {
    it('stores a thumb and an error report about a place of the plan', () => {
      const made = service().create(request({ input: DAN }));
      const id = made.body.plan_id;
      const venue = made.body.plan.stanice[0].lokacija_id;
      expect(service().feedback(request({ input: { plan_id: id, rating: 1 } }))).toEqual({ status: 201, body: { ok: true } });
      later(3);
      expect(service().feedback(request({ input: { plan_id: id, venue_id: venue, comment: '  Zatvoreno   je  ' } })).status).toBe(201);
      expect(rows('SELECT rating, comment, venue_id FROM planner_feedback ORDER BY id')).toEqual([
        { rating: '1', comment: null, venue_id: null },
        { rating: null, comment: 'Zatvoreno je', venue_id: String(venue) },
      ]);
    });

    it('rejects ratings other than ±1, places outside the plan and long comments', () => {
      const made = service().create(request({ input: DAN }));
      const id = made.body.plan_id;
      const bad = [{ rating: 5 }, { venue_id: 424242, comment: 'x' }, { comment: 'x'.repeat(501) }, {}];
      for (const input of bad) {
        later(3);
        expect(service().feedback(request({ input: { plan_id: id, ...input } })).status).toBe(400);
      }
    });
  });

  describe('GET quota', () => {
    it('3 for a device it has not seen, the stored count after plans', () => {
      expect(service().quota(request())).toEqual({ status: 200, body: { remaining: 3, next_at: null } });
      const made = service().create(request({ input: DAN }));
      expect(service().quota(request({ device: made.cookies[0].value }))).toEqual({ status: 200, body: { remaining: 2, next_at: null } });
      expect(service().quota(request({ device: 'not-a-uuid' })).body.remaining).toBe(3);
    });
  });

  describe('daily cleanup', () => {
    it('deletes quota rows older than 8 days and keeps the rest', () => {
      const { cleanup } = require('../../lib/planner/store');
      const h = 'a'.repeat(64);
      rows('INSERT INTO planner_quota (device_hash, ip_hash, plan_id, created_at) VALUES (?, ?, NULL, ?), (?, ?, NULL, ?)', h, h, '2026-11-11 08:59:00.000', h, h, '2026-11-12 09:01:00.000');
      expect(cleanup(database.db, NOW)).toEqual({ quota: 1, weather: 0 });
      expect(rows('SELECT created_at FROM planner_quota')).toEqual([{ created_at: '2026-11-12 09:01:00.000' }]);
    });
  });
});
