/**
 * Validation of the planner form against whitelists.
 *
 * Only known keys survive: the normalized object is what gets hashed and
 * stored, so a field the form should never send (the dog's name above all)
 * cannot reach the database even if a client sends it.
 */
const { CITIES, DESTINATIONS, MAX_DAYS_AHEAD, NIGHTS, WHITELIST } = require('./config');
const { daysBetween, parseDate } = require('./time');

/** MARS `param()` hands values over as strings; JSON bodies as booleans or numbers. */
function toBoolean(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return null;
}

function toInteger(value) {
  if (typeof value === 'number' && Number.isInteger(value)) return value;
  if (typeof value === 'string' && /^-?\d+$/.test(value.trim())) return Number(value.trim());
  return null;
}

function oneOf(value, allowed) {
  const text = typeof value === 'string' ? value.trim().toLowerCase() : null;
  return text !== null && allowed.includes(text) ? text : null;
}

/**
 * @param {Record<string, unknown>} input raw request parameters
 * @param {{ today: string }} context today's date in Belgrade, 'YYYY-MM-DD'
 * @returns {{ ok: true, params: object } | { ok: false, errors: string[] }}
 */
function validatePlannerInput(input, context) {
  const errors = [];
  const field = (name, value) => {
    if (value === null) errors.push(name);
    return value;
  };

  const mode = field('mode', oneOf(input.mode, WHITELIST.mode));
  if (!mode) return { ok: false, errors };

  const velicina = field('velicina', oneOf(input.velicina, WHITELIST.velicina));

  if (mode === 'dan') {
    const grad = field('grad', oneOf(input.grad, Object.keys(CITIES)));
    const datum = field('datum', validDate(input.datum, context.today));
    const params = {
      mode,
      grad,
      datum,
      velicina,
      energija: field('energija', oneOf(input.energija, WHITELIST.energija)),
      osetljiv_na_vrucinu: field('osetljiv_na_vrucinu', toBoolean(input.osetljiv_na_vrucinu)),
      tip_dana: field('tip_dana', oneOf(input.tip_dana, WHITELIST.tip_dana)),
    };
    return errors.length ? { ok: false, errors } : { ok: true, params };
  }

  const nights = toInteger(input.broj_noci);
  const params = {
    mode,
    destinacija: field('destinacija', oneOf(input.destinacija, Object.keys(DESTINATIONS))),
    broj_noci: field('broj_noci', nights !== null && nights >= NIGHTS.min && nights <= NIGHTS.max ? nights : null),
    velicina,
    dlaka: field('dlaka', oneOf(input.dlaka, WHITELIST.dlaka)),
    neko_skija: field('neko_skija', toBoolean(input.neko_skija)),
    pas_sme_sam: field('pas_sme_sam', toBoolean(input.pas_sme_sam)),
  };
  return errors.length ? { ok: false, errors } : { ok: true, params };
}

/** A real calendar date from today up to MAX_DAYS_AHEAD days ahead. */
function validDate(value, today) {
  if (typeof value !== 'string' || !parseDate(value.trim())) return null;
  const date = value.trim();
  const ahead = daysBetween(today, date);
  return ahead >= 0 && ahead <= MAX_DAYS_AHEAD ? date : null;
}

module.exports = { validatePlannerInput, toBoolean, toInteger };
