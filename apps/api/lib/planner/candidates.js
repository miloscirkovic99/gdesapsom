/**
 * Which places the model may choose from.
 *
 * Handlers turn SQL rows into candidates (see `Candidate`); this module drops
 * the ones that do not fit the day, scores the rest and keeps the best per
 * category. `premium` never adds to the score: it only decides between
 * candidates with the same score.
 *
 * @typedef {'kafic'|'restoran'|'bar'|'smestaj'|'park'|'staza'|'veterinar'} Category
 * @typedef {{
 *   id: number, naziv: string, kategorija: Category, kvart: string|null,
 *   lat: number|null, lng: number|null,
 *   psi_unutra: boolean|null, psi_basta: boolean|null,
 *   max_velicina: 'mali'|'srednji'|'veliki'|'svi'|null,
 *   radno_vreme: object|null, kratak_opis: string|null,
 *   premium: boolean, poslednja_provera: string|null,
 *   voda_za_pse: boolean|null, hlad: boolean|null, ogradjeno: boolean|null,
 *   pas_sme_sam_u_sobi?: boolean|null
 * }} Candidate
 */
const { CANDIDATES, VET_MAX_DISTANCE_KM, WEATHER } = require('./config');
const { distanceM } = require('./geo');
const { hoursLabel, isOpenOn } = require('./hours');
const { daysBetween } = require('./time');

const DINING = ['kafic', 'restoran', 'bar'];
const WALKS = ['park', 'staza'];
const SIZE_ORDER = ['mali', 'srednji', 'veliki'];

/** Whether a dog of `velicina` is allowed where `max` is the largest size admitted; null = unknown. */
function sizeAllows(max, velicina) {
  if (max === null || max === undefined) return null;
  if (max === 'svi') return true;
  return SIZE_ORDER.indexOf(velicina) <= SIZE_ORDER.indexOf(max);
}

function needsIndoor(weather) {
  return !!weather && (weather.rainy || weather.cold);
}

/** Reasons a candidate cannot be offered at all, or [] when it can. */
function exclusionReasons(candidate, context) {
  const { params, weather, date } = context;
  const reasons = [];

  if (date && candidate.kategorija !== 'veterinar' && isOpenOn(candidate.radno_vreme, date) === false) reasons.push('closed');
  if (sizeAllows(candidate.max_velicina, params.velicina) === false) reasons.push('size');
  if (needsIndoor(weather) && DINING.includes(candidate.kategorija) && candidate.psi_unutra !== true) reasons.push('indoor');
  if (
    candidate.kategorija === 'smestaj' &&
    params.neko_skija === true &&
    params.pas_sme_sam === true &&
    candidate.pas_sme_sam_u_sobi === false
  ) {
    reasons.push('alone');
  }
  return reasons;
}

function score(candidate, context) {
  const { params, weather, today } = context;
  const walk = WALKS.includes(candidate.kategorija);
  const dining = DINING.includes(candidate.kategorija);
  let points = 0;

  if (needsIndoor(weather) && candidate.psi_unutra === true) points += 2;
  if (weather && !needsIndoor(weather) && dining && candidate.psi_basta === true) points += 1;
  if (candidate.voda_za_pse === true) points += 1;

  const warm = !!weather && weather.tMax >= WEATHER.warmC;
  if (warm && params.osetljiv_na_vrucinu === true && candidate.hlad === true) points += 1.5;
  if (walk && params.energija === 'visoka' && candidate.ogradjeno === true) points += 1.5;
  if (walk && params.tip_dana === 'aktivan') points += 1;
  if (dining && params.tip_dana === 'opusten') points += 0.5;

  if (candidate.kategorija === 'smestaj' && params.neko_skija && params.pas_sme_sam && candidate.pas_sme_sam_u_sobi === true) {
    points += 2;
  }

  // Unknown is not "no", but it is less certain than a confirmed yes.
  if (candidate.max_velicina == null && params.velicina !== 'mali') points -= params.velicina === 'veliki' ? 1.5 : 0.5;
  if (dining && candidate.radno_vreme == null) points -= 0.5;
  if (candidate.poslednja_provera && today && daysBetween(candidate.poslednja_provera, today) <= 365) points += 0.5;

  return points;
}

/** Score desc, then premium, then id: the order is total, so the result is deterministic. */
function byRank(a, b) {
  return b.score - a.score || Number(!!b.candidate.premium) - Number(!!a.candidate.premium) || a.candidate.id - b.candidate.id;
}

/**
 * The candidates for one request, best first within each category.
 *
 * @param {Candidate[]} candidates
 * @param {{ params: object, weather: object|null, date: string|null, today: string, center: {lat:number,lng:number} }} context
 * @returns {Candidate[]}
 */
function selectCandidates(candidates, context) {
  const { quota, total, capped } = CANDIDATES[context.params.mode];
  const ranked = candidates
    .filter((candidate) => exclusionReasons(candidate, context).length === 0)
    .map((candidate) => ({
      candidate,
      // The nearest vets matter, not the best-described ones.
      score: candidate.kategorija === 'veterinar' ? -distanceM(context.center, candidate) / 1000 : score(candidate, context),
    }))
    .filter((item) => item.candidate.kategorija !== 'veterinar' || -item.score <= VET_MAX_DISTANCE_KM)
    .sort(byRank);

  const chosen = [];
  const left = [];
  const taken = {};
  for (const item of ranked) {
    const category = item.candidate.kategorija;
    if (!(category in quota)) continue;
    if ((taken[category] || 0) < quota[category]) {
      taken[category] = (taken[category] || 0) + 1;
      chosen.push(item);
    } else {
      left.push(item);
    }
  }
  // Fill up to the total from what the quotas left out, never past a hard cap.
  for (const item of left) {
    if (chosen.length >= total) break;
    if (!capped.includes(item.candidate.kategorija)) chosen.push(item);
  }

  return chosen.slice(0, total).map((item) => item.candidate);
}

const yesNo = (value) => (value === true ? 'da' : value === false ? 'ne' : '?');

/** One field of a candidate line: no separators, no line breaks, bounded length. */
function lineText(value, max) {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[|\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

/** `id|naziv|kategorija|kvart|lat,lng|unutra|bašta|max_veličina|radno_vreme|opis` */
function candidateLine(candidate, date) {
  const coords =
    candidate.lat != null && candidate.lng != null
      ? `${Number(candidate.lat).toFixed(5)},${Number(candidate.lng).toFixed(5)}`
      : '?';
  return [
    candidate.id,
    lineText(candidate.naziv, 80),
    candidate.kategorija,
    lineText(candidate.kvart, 40) || '?',
    coords,
    yesNo(candidate.psi_unutra),
    yesNo(candidate.psi_basta),
    candidate.max_velicina || '?',
    date ? hoursLabel(candidate.radno_vreme, date) : '?',
    lineText(candidate.kratak_opis, 200),
  ].join('|');
}

module.exports = { selectCandidates, candidateLine, exclusionReasons, sizeAllows, score, needsIndoor, DINING, WALKS };
