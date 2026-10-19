/**
 * The user message sent with the system prompt (docs/planer-sistemski-prompt.md),
 * and the JSON schemas the providers' structured output is held to.
 *
 * The dog's name is never part of either: the model writes {{ime}} and the
 * browser fills it in.
 */
const { CITIES, DESTINATIONS } = require('./config');
const { candidateLine } = require('./candidates');
const { dayKey } = require('./time');
const { describeForPrompt } = require('./weather');

const DAY_NAMES = { pon: 'ponedeljak', uto: 'utorak', sre: 'sreda', cet: 'četvrtak', pet: 'petak', sub: 'subota', ned: 'nedelja' };
const yesNo = (value) => (value ? 'da' : 'ne');
const CANDIDATE_HEADER = 'KANDIDATI (id|naziv|kategorija|kvart|lat,lng|unutra|bašta|max_veličina|radno_vreme|opis):';

/**
 * @param {{ params: object, weather: object|null, candidates: object[], date: string|null }} input
 * @returns {string}
 */
function buildUserMessage({ params, weather, candidates, date }) {
  const lines = [`REŽIM: ${params.mode}`];

  if (params.mode === 'dan') {
    lines.push(`GRAD: ${CITIES[params.grad].name}`);
    lines.push(`DATUM: ${params.datum} (${DAY_NAMES[dayKey(params.datum)]})`);
    lines.push(
      `PROFIL PSA: veličina ${params.velicina}; energija ${params.energija}; osetljiv na vrućinu: ${yesNo(
        params.osetljiv_na_vrucinu,
      )}; tip dana: ${params.tip_dana}`,
    );
  } else {
    lines.push(`DESTINACIJA: ${DESTINATIONS[params.destinacija].name}`);
    lines.push(`BROJ NOĆI: ${params.broj_noci} (najviše ${params.broj_noci + 1} dana u rasporedu)`);
    lines.push(
      `PROFIL PSA: veličina ${params.velicina}; dlaka ${params.dlaka}; neko skija: ${yesNo(
        params.neko_skija,
      )}; pas sme sam u sobi: ${yesNo(params.pas_sme_sam)}`,
    );
  }

  lines.push(`PROGNOZA: ${describeForPrompt(weather)}`);
  lines.push(CANDIDATE_HEADER);
  for (const candidate of candidates) lines.push(candidateLine(candidate, date));
  lines.push(`Vrati samo JSON po šemi za režim "${params.mode}".`);
  return lines.join('\n');
}

const STOP_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['vreme', 'lokacija_id', 'zasto', 'savet_za_psa'],
  properties: {
    vreme: { type: 'string', description: 'HH:MM' },
    lokacija_id: { type: 'integer' },
    zasto: { type: 'string' },
    savet_za_psa: { type: 'string' },
  },
};

const NOTES_SCHEMA = { type: 'array', items: { type: 'string' } };

/**
 * One schema per mode, without numeric or length constraints: Anthropic's
 * structured outputs reject them, and validatePlan enforces the limits anyway.
 */
const PLAN_SCHEMAS = {
  dan: {
    type: 'object',
    additionalProperties: false,
    required: ['naslov', 'stanice', 'napomene'],
    properties: {
      naslov: { type: 'string' },
      stanice: { type: 'array', items: STOP_SCHEMA },
      napomene: NOTES_SCHEMA,
    },
  },
  zimovanje: {
    type: 'object',
    additionalProperties: false,
    required: ['naslov', 'smestaj', 'dani', 'veterinar_id', 'napomene'],
    properties: {
      naslov: { type: 'string' },
      smestaj: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['lokacija_id', 'zasto'],
          properties: { lokacija_id: { type: 'integer' }, zasto: { type: 'string' } },
        },
      },
      dani: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['dan', 'stanice'],
          properties: { dan: { type: 'integer' }, stanice: { type: 'array', items: STOP_SCHEMA } },
        },
      },
      veterinar_id: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
      napomene: NOTES_SCHEMA,
    },
  },
};

module.exports = { buildUserMessage, PLAN_SCHEMAS, CANDIDATE_HEADER };
