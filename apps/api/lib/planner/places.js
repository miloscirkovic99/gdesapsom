/**
 * `planner_mesta` rows (db/06_planer_i_zimovanje.sql) as the planner uses
 * them: candidates for the model and the rules, and the places a plan
 * response shows.
 *
 * A NULL column stays null in both. Nothing is filled in from another field,
 * so the page cannot show a rule, price or opening time the database does
 * not hold.
 */
const { bool, isoDate, num } = require('../http-helpers');
const { parseHours } = require('./hours');

/** Columns of planner_mesta the planner reads, in SELECT order. */
const PLACE_COLUMNS = [
  'id', 'izvor', 'izvor_id', 'naziv', 'kategorija', 'grad', 'adresa', 'kvart', 'lat', 'lng',
  'psi_unutra', 'psi_basta', 'max_velicina_psa', 'radno_vreme', 'kratak_opis', 'premium', 'poslednja_provera',
  'voda_za_pse', 'hlad', 'ogradjeno', 'doplata_za_psa', 'doplata_valuta', 'doplata_po', 'max_pasa',
  'pas_sme_sam_u_sobi', 'affiliate_url', 'destinacija_id', 'telefon',
];

const SIZES = ['mali', 'srednji', 'veliki', 'svi'];

/** Affiliate links are shown only as https URLs; anything else is treated as missing. */
function safeAffiliate(value) {
  return typeof value === 'string' && /^https:\/\/[^\s"'<>]+$/.test(value.trim()) ? value.trim() : null;
}

function text(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

/** A row as a candidate (lib/planner/candidates.js `Candidate`), opening hours parsed. */
function toCandidate(row) {
  return {
    id: num(row.id),
    naziv: text(row.naziv),
    kategorija: row.kategorija,
    kvart: text(row.kvart),
    lat: num(row.lat),
    lng: num(row.lng),
    psi_unutra: bool(row.psi_unutra),
    psi_basta: bool(row.psi_basta),
    max_velicina: SIZES.includes(row.max_velicina_psa) ? row.max_velicina_psa : null,
    radno_vreme: parseHours(row.radno_vreme),
    kratak_opis: text(row.kratak_opis),
    premium: bool(row.premium) === true,
    poslednja_provera: isoDate(row.poslednja_provera),
    voda_za_pse: bool(row.voda_za_pse),
    hlad: bool(row.hlad),
    ogradjeno: bool(row.ogradjeno),
    pas_sme_sam_u_sobi: bool(row.pas_sme_sam_u_sobi),
  };
}

/**
 * The same candidate with `radno_vreme` as stored, for the eval export
 * (eval/build-scenarios.mjs parses it the way the planner does).
 */
function toExportCandidate(row) {
  let hours = row.radno_vreme;
  if (typeof hours === 'string') {
    try {
      hours = JSON.parse(hours);
    } catch {
      hours = null;
    }
  }
  return { ...toCandidate(row), radno_vreme: hours === undefined ? null : hours };
}

/** A place in a plan response (portal: PlannerPlace). */
function toPlace(row) {
  const fee = num(row.doplata_za_psa);
  const place = {
    id: num(row.id),
    naziv: text(row.naziv),
    kategorija: row.kategorija,
    adresa: text(row.adresa),
    kvart: text(row.kvart),
    lat: num(row.lat),
    lng: num(row.lng),
    // Only venues have their own page on the site.
    url: row.izvor === 'lokal' && num(row.izvor_id) !== null ? `/spots/${num(row.izvor_id)}` : null,
    affiliate_url: row.kategorija === 'smestaj' ? safeAffiliate(row.affiliate_url) : null,
  };
  if (row.kategorija === 'smestaj') {
    place.doplata_za_psa =
      fee !== null && ['RSD', 'EUR'].includes(row.doplata_valuta) && ['noc', 'boravak'].includes(row.doplata_po)
        ? { amount: fee, currency: row.doplata_valuta, per: row.doplata_po }
        : null;
    place.max_pasa = num(row.max_pasa);
    place.pas_sme_sam_u_sobi = bool(row.pas_sme_sam_u_sobi);
  }
  if (row.kategorija === 'veterinar') place.telefon = text(row.telefon);
  return place;
}

module.exports = { PLACE_COLUMNS, toCandidate, toExportCandidate, toPlace, safeAffiliate };
