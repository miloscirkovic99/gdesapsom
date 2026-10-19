/**
 * Everything outside the planner, faked for the tests: Turnstile, MET Norway,
 * the three AI providers, and the MARS modules object a handler receives.
 * Nothing here reaches the network.
 */
const { CANDIDATE_HEADER } = require('../../lib/planner/prompt');
const { metForecast } = require('../planner/fixtures');

/** Candidate lines of a user message → [{ id, kategorija }]. */
function candidatesInMessage(user) {
  const lines = user.split('\n');
  const start = lines.indexOf(CANDIDATE_HEADER);
  return lines
    .slice(start + 1)
    .filter((line) => /^\d+\|/.test(line))
    .map((line) => {
      const [id, , kategorija] = line.split('|');
      return { id: Number(id), kategorija };
    });
}

/** A plan a well-behaved model could return for this message: real ids, rising times. */
function modelPlan(user) {
  const candidates = candidatesInMessage(user);
  const nights = Number((/BROJ NOĆI: (\d+)/.exec(user) || [])[1] || 0);
  const stop = (candidate, vreme) => ({ vreme, lokacija_id: candidate.id, zasto: 'Blizu je i prima pse.', savet_za_psa: 'Ponesi vodu za {{ime}}.' });
  if (!nights) {
    const usable = candidates.filter((c) => c.kategorija !== 'veterinar' && c.kategorija !== 'smestaj').slice(0, 3);
    return { naslov: 'Dan sa psom', stanice: usable.map((c, i) => stop(c, ['10:00', '12:00', '14:00'][i])), napomene: [] };
  }
  const stays = candidates.filter((c) => c.kategorija === 'smestaj').slice(0, 2);
  const outings = candidates.filter((c) => c.kategorija === 'staza' || c.kategorija === 'restoran');
  const vet = candidates.find((c) => c.kategorija === 'veterinar');
  return {
    naslov: 'Zima sa psom',
    smestaj: stays.map((c) => ({ lokacija_id: c.id, zasto: 'Prima pse.' })),
    dani: [{ dan: 1, stanice: outings.slice(0, 2).map((c, i) => stop(c, ['10:00', '13:00'][i])) }],
    veterinar_id: vet ? vet.id : null,
    napomene: ['Proveri da li gondola prima pse pre polaska.'],
  };
}

const userMessageOf = (request) => {
  const body = JSON.parse(request.body);
  if (body.contents) return body.contents[0].parts[0].text; // Gemini
  return body.messages.find((message) => message.role === 'user').content; // Cloudflare, Anthropic
};

const REPLIES = {
  gemini: (plan) => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(plan) }] }, finishReason: 'STOP' }], usageMetadata: { promptTokenCount: 1000, candidatesTokenCount: 200 } }),
  cloudflare: (plan) => ({ success: true, result: { choices: [{ message: { content: JSON.stringify(plan) }, finish_reason: 'stop' }], usage: { prompt_tokens: 1000, completion_tokens: 200 } } }),
  anthropic: (plan) => ({ content: [{ type: 'text', text: JSON.stringify(plan) }], stop_reason: 'end_turn', usage: { input_tokens: 1000, output_tokens: 200 } }),
};

function providerOf(url) {
  if (url.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (url.includes('api.cloudflare.com')) return 'cloudflare';
  if (url.includes('api.anthropic.com')) return 'anthropic';
  return null;
}

/**
 * Fake outbound HTTP. `behaviour[provider]`: 'ok' | 'error' (HTTP 500) |
 * 'throw' (timeout) | 'unknown_id' (a plan naming a place not sent).
 * `met`: 'ok' | 'error'; `metTemp`: °C for the whole forecast.
 */
function createFakeHttp(options = {}) {
  const state = {
    behaviour: { gemini: 'ok', cloudflare: 'ok', anthropic: 'ok', ...(options.behaviour || {}) },
    met: options.met || 'ok',
    metTemp: options.metTemp === undefined ? 12 : options.metTemp,
    calls: [],
  };

  function http(request, timeoutMs) {
    const { url } = request;
    state.calls.push({ url, method: request.method, headers: request.headers, body: request.body, timeoutMs });

    if (url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')) {
      const token = decodeURIComponent((/response=([^&]*)/.exec(request.body) || [])[1] || '');
      return { status: 200, body: JSON.stringify(token === 'ok-token' ? { success: true } : { success: false, 'error-codes': ['invalid-input-response'] }), headers: {} };
    }

    if (url.startsWith('https://api.met.no/')) {
      if (state.met !== 'ok') return { status: 500, body: '', headers: {} };
      const dates = state.forecastDates || [];
      const series = dates.flatMap((date) => metForecast(date, { temp: state.metTemp }).properties.timeseries);
      return {
        status: 200,
        body: JSON.stringify({ properties: { timeseries: series } }),
        headers: { Expires: new Date(Date.parse(options.metExpires || '2100-01-01T00:00:00Z')).toUTCString(), 'Last-Modified': 'Fri, 20 Nov 2026 08:00:00 GMT' },
      };
    }

    const provider = providerOf(url);
    if (provider) {
      const mode = state.behaviour[provider];
      if (mode === 'throw') throw Object.assign(new Error('timeout'), { kind: 'timeout' });
      if (mode === 'error') return { status: 500, body: '{"error":"x"}', headers: {} };
      const plan = modelPlan(userMessageOf(request));
      if (mode === 'unknown_id') {
        const first = plan.stanice ? plan.stanice[0] : plan.dani[0].stanice[0];
        first.lokacija_id = 999999;
      }
      return { status: 200, body: JSON.stringify(REPLIES[provider](plan)), headers: {} };
    }

    throw new Error(`Unexpected request to ${url}`);
  }

  return { http, state };
}

class ExitSignal extends Error {}

/**
 * The MARSModules object of one request, as far as the handlers use it.
 * `exit()` throws ExitSignal like a script end; callHandler catches it.
 */
function fakeMarsModules({ db, http, env = {}, params = {}, headers = {}, ip = null, session = null }) {
  const out = { status: 200, headers: {}, cookies: [], body: {}, exited: false };
  const modules = {
    param(name, fallback) {
      if (name === undefined) return Object.keys(params);
      return Object.prototype.hasOwnProperty.call(params, name) ? params[name] : fallback === undefined ? null : fallback;
    },
    db: { query: (sql, ...args) => db.query(sql, ...args), commit: () => db.commit() },
    write: (key, value) => {
      out.body[key] = JSON.parse(JSON.stringify(value));
    },
    response: {
      status: (code) => {
        out.status = code;
      },
      header: (name, value) => {
        if (name.toLowerCase() === 'set-cookie') out.cookies.push(value);
        else out.headers[name] = value;
      },
    },
    exit: () => {
      out.exited = true;
      throw new ExitSignal('exit');
    },
    session: (key) => (key === 'user' ? session : null),
    env: (name) => (Object.prototype.hasOwnProperty.call(env, name) ? env[name] : null),
    request: { headers: Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v])), ip },
    net: { request: (options) => http(options, options.timeout) },
  };
  return { modules, out };
}

/** Runs a handler like MARS would and returns what it wrote. */
function callHandler(handler, world) {
  const { modules, out } = fakeMarsModules(world);
  try {
    handler(modules);
  } catch (error) {
    if (!(error instanceof ExitSignal)) throw error;
  }
  return out;
}

module.exports = { createFakeHttp, fakeMarsModules, callHandler, modelPlan, candidatesInMessage, ExitSignal };
