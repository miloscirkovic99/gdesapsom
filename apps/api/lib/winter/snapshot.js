/**
 * The data of the winter pages, built from `destinacija` and `planner_mesta`
 * rows. Same shape as apps/gde-sa-psom-portal/.../winter/winter-data.json:
 * GET /api/v2/winter/destinations returns it, tools/fetch-winter-data.mjs
 * saves it before the build, the pages refresh from it in the browser.
 *
 * Only what the database holds: a NULL column stays null, and nothing is
 * derived from another field.
 */
const { VET_MAX_DISTANCE_KM } = require('../planner/config');
const { distanceM } = require('../planner/geo');
const { safeAffiliate } = require('../planner/places');
const { bool, isoDate, num } = require('../http-helpers');

const byPremiumThenName = (a, b) => num(b.premium) - num(a.premium) || String(a.naziv).localeCompare(String(b.naziv), 'sr');

function stay(row) {
  const fee =
    num(row.doplata_za_psa) !== null && row.doplata_valuta && row.doplata_po
      ? { amount: num(row.doplata_za_psa), currency: row.doplata_valuta, per: row.doplata_po }
      : null;
  return {
    id: num(row.id),
    name: row.naziv,
    address: row.adresa || null,
    dogFee: fee,
    maxDogs: num(row.max_pasa),
    dogMayStayAlone: bool(row.pas_sme_sam_u_sobi),
    maxDogSize: row.max_velicina_psa || null,
    affiliateUrl: safeAffiliate(row.affiliate_url),
  };
}

/**
 * @param {{ destinations: object[], places: object[], today: string }} input
 *   destinations: destinacija rows; places: planner_mesta rows (with destinacija_id, or vets with coordinates)
 */
function buildWinterSnapshot({ destinations, places, today }) {
  const out = {};
  for (const destination of destinations) {
    const id = num(destination.id);
    const here = places.filter((place) => num(place.destinacija_id) === id);
    const center = { lat: num(destination.lat), lng: num(destination.lng) };

    const vets = places
      .filter((place) => place.kategorija === 'veterinar' && num(place.lat) !== null && num(place.lng) !== null)
      .map((place) => ({ place, km: distanceM(center, { lat: num(place.lat), lng: num(place.lng) }) / 1000 }))
      .filter((item) => item.km <= VET_MAX_DISTANCE_KM)
      .sort((a, b) => a.km - b.km);
    const nearest = vets[0];

    out[destination.slug] = {
      stays: here.filter((place) => place.kategorija === 'smestaj').sort(byPremiumThenName).map(stay),
      restaurants: here
        .filter((place) => place.kategorija === 'restoran' && bool(place.psi_unutra) === true)
        .sort(byPremiumThenName)
        .map((place) => ({ id: num(place.id), name: place.naziv, address: place.adresa || null })),
      trails: here
        .filter((place) => place.kategorija === 'staza')
        .sort(byPremiumThenName)
        .map((place) => ({ id: num(place.id), name: place.naziv, lengthKm: num(place.duzina_km), description: place.kratak_opis || null })),
      gondola: { dogsAllowed: bool(destination.gondola_psi), checkedAt: isoDate(destination.gondola_provereno) },
      skiLifts: { dogsAllowed: bool(destination.zicare_psi), checkedAt: isoDate(destination.zicare_provereno) },
      vet: nearest
        ? {
            id: num(nearest.place.id),
            name: nearest.place.naziv,
            address: nearest.place.adresa || null,
            phone: nearest.place.telefon || null,
            distanceKm: Math.round(nearest.km * 10) / 10,
          }
        : null,
    };
  }
  return { generatedAt: today, destinations: out };
}

const DESTINATION_COLUMNS = ['id', 'slug', 'naziv', 'lat', 'lng', 'gondola_psi', 'gondola_provereno', 'zicare_psi', 'zicare_provereno'];
const PLACE_COLUMNS = [
  'id', 'naziv', 'kategorija', 'adresa', 'lat', 'lng', 'psi_unutra', 'max_velicina_psa', 'premium', 'kratak_opis',
  'doplata_za_psa', 'doplata_valuta', 'doplata_po', 'max_pasa', 'pas_sme_sam_u_sobi', 'affiliate_url', 'destinacija_id', 'telefon',
];

const DESTINATIONS_SQL = `SELECT ${DESTINATION_COLUMNS.join(', ')} FROM destinacija ORDER BY id`;
const PLACES_SQL = `
  SELECT m.${PLACE_COLUMNS.join(', m.')}, s.duzina_km
  FROM planner_mesta m
  LEFT JOIN staza s ON m.izvor = 'staza' AND s.id = m.izvor_id
  WHERE m.destinacija_id IS NOT NULL
     OR (m.kategorija = 'veterinar' AND m.lat IS NOT NULL AND m.lng IS NOT NULL)`;

module.exports = { buildWinterSnapshot, DESTINATIONS_SQL, PLACES_SQL, DESTINATION_COLUMNS, PLACE_COLUMNS: [...PLACE_COLUMNS, 'duzina_km'] };
