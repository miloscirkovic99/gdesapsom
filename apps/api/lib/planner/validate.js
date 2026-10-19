/**
 * Checks a model's plan before anyone sees it. A plan that fails sends the
 * cascade to the next provider; nothing is repaired, because a repaired plan
 * is no longer the one the model reasoned about.
 *
 * Besides the shape of the schema in docs/planer-sistemski-prompt.md:
 * - every lokacija_id (and veterinar_id) is one of the candidates sent;
 * - times rise within a day;
 * - at most 5 stops a day (4 in "zimovanje", as the prompt says);
 * - above 28 °C no walk between 11 and 17 h;
 * - a place with known hours is open at the time of its stop.
 */
const { PLAN_RULES, WEATHER } = require('./config');
const { isOpenAt } = require('./hours');
const { toMinutes } = require('./time');
const { WALKS } = require('./candidates');

function cleanText(value) {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text ? text.slice(0, PLAN_RULES.maxTextLength) : null;
}

function cleanNotes(value, errors) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) {
    errors.push('napomene');
    return [];
  }
  return value.map(cleanText).filter(Boolean).slice(0, PLAN_RULES.maxNotes);
}

/**
 * @param {unknown} raw parsed JSON from the model
 * @param {{ params: object, candidates: object[], weather: object|null, date: string|null }} context
 * @returns {{ ok: true, plan: object } | { ok: false, errors: string[] }}
 */
function validatePlan(raw, context) {
  const errors = [];
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, errors: ['not_an_object'] };

  const byId = new Map(context.candidates.map((candidate) => [Number(candidate.id), candidate]));
  const naslov = cleanText(raw.naslov);
  if (!naslov) errors.push('naslov');

  const stopsOf = (list, where, maxStops) => validateStops(list, where, maxStops, byId, context, errors);

  if (context.params.mode === 'dan') {
    const stanice = stopsOf(raw.stanice, 'stanice', PLAN_RULES.danMaxStops);
    if (stanice && stanice.length < PLAN_RULES.danMinStops) errors.push('stanice:too_few');
    if (stanice && new Set(stanice.map((stop) => stop.lokacija_id)).size !== stanice.length) errors.push('stanice:repeated');
    const napomene = cleanNotes(raw.napomene, errors);
    return errors.length ? { ok: false, errors } : { ok: true, plan: { naslov, stanice, napomene } };
  }

  // zimovanje
  const smestaj = validateStays(raw.smestaj, byId, errors);
  const dani = validateDays(raw.dani, byId, context, errors);
  const veterinarId = validateVet(raw.veterinar_id, byId, errors);
  const napomene = cleanNotes(raw.napomene, errors);
  return errors.length
    ? { ok: false, errors }
    : { ok: true, plan: { naslov, smestaj, dani, veterinar_id: veterinarId, napomene } };
}

function validateStops(list, where, maxStops, byId, context, errors) {
  if (!Array.isArray(list) || list.length === 0) {
    errors.push(`${where}:missing`);
    return null;
  }
  if (list.length > Math.min(maxStops, PLAN_RULES.maxStopsPerDay)) errors.push(`${where}:too_many`);

  const stops = [];
  let previous = -1;
  list.forEach((stop, index) => {
    const at = `${where}[${index}]`;
    if (!stop || typeof stop !== 'object') {
      errors.push(at);
      return;
    }
    const minutes = toMinutes(stop.vreme);
    const id = Number(stop.lokacija_id);
    const candidate = Number.isInteger(id) ? byId.get(id) : undefined;

    if (minutes === null) errors.push(`${at}.vreme`);
    else if (minutes <= previous) errors.push(`${at}.vreme:not_rising`);
    if (minutes !== null) previous = minutes;

    if (!candidate) errors.push(`${at}.lokacija_id:unknown`);
    else if (candidate.kategorija === 'smestaj' || candidate.kategorija === 'veterinar') errors.push(`${at}.lokacija_id:category`);

    if (candidate && minutes !== null) {
      const hot = context.weather && context.weather.tMax > WEATHER.hotC;
      const hour = Math.floor(minutes / 60);
      if (hot && WALKS.includes(candidate.kategorija) && hour >= PLAN_RULES.noWalkFrom && hour < PLAN_RULES.noWalkTo) {
        errors.push(`${at}:walk_in_heat`);
      }
      if (context.date && isOpenAt(candidate.radno_vreme, context.date, stop.vreme) === false) errors.push(`${at}:closed`);
    }

    const zasto = cleanText(stop.zasto);
    const savet = cleanText(stop.savet_za_psa);
    if (!zasto) errors.push(`${at}.zasto`);
    if (!savet) errors.push(`${at}.savet_za_psa`);
    stops.push({ vreme: stop.vreme, lokacija_id: id, zasto, savet_za_psa: savet });
  });
  return stops;
}

function validateStays(list, byId, errors) {
  if (!Array.isArray(list) || list.length < PLAN_RULES.smestajMin || list.length > PLAN_RULES.smestajMax) {
    errors.push('smestaj:count');
    return [];
  }
  const ids = new Set();
  return list.map((stay, index) => {
    const id = Number(stay && stay.lokacija_id);
    const candidate = byId.get(id);
    if (!candidate) errors.push(`smestaj[${index}].lokacija_id:unknown`);
    else if (candidate.kategorija !== 'smestaj') errors.push(`smestaj[${index}].lokacija_id:category`);
    if (ids.has(id)) errors.push(`smestaj[${index}]:repeated`);
    ids.add(id);
    const zasto = cleanText(stay && stay.zasto);
    if (!zasto) errors.push(`smestaj[${index}].zasto`);
    return { lokacija_id: id, zasto };
  });
}

function validateDays(list, byId, context, errors) {
  const maxDays = context.params.broj_noci + 1;
  if (!Array.isArray(list) || list.length === 0 || list.length > maxDays) {
    errors.push('dani:count');
    return [];
  }
  return list.map((day, index) => {
    const number = Number(day && day.dan);
    if (number !== index + 1) errors.push(`dani[${index}].dan`);
    // Winter days have no date: hours are checked by weekday only when a date is known.
    const stanice = validateStops(day && day.stanice, `dani[${index}].stanice`, PLAN_RULES.zimovanjeMaxStopsPerDay, byId, { ...context, date: null }, errors) || [];
    return { dan: number, stanice };
  });
}

function validateVet(value, byId, errors) {
  if (value === null || value === undefined) return null;
  const id = Number(value);
  const candidate = byId.get(id);
  if (!candidate || candidate.kategorija !== 'veterinar') {
    errors.push('veterinar_id:unknown');
    return null;
  }
  return id;
}

module.exports = { validatePlan, cleanText };
