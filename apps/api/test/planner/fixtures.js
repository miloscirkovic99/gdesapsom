// Test data only: invented places with ids from 1 to 2 000 xxx; never shipped.
const { parseHours } = require('../../lib/planner/hours');

/** Opening hours as stored (`radno_vreme` JSON); candidates carry them parsed. */
const WEEK_JSON = { pon: [['08:00', '23:00']], uto: [['08:00', '23:00']], sre: [['08:00', '23:00']], cet: [['08:00', '23:00']], pet: [['08:00', '23:00']], sub: [['09:00', '23:00']], ned: [['09:00', '22:00']] };

const WEEK = parseHours(WEEK_JSON);

function place(id, kategorija, lat, lng, extra = {}) {
  return {
    id,
    naziv: `Mesto ${id}`,
    kategorija,
    kvart: 'Centar',
    lat,
    lng,
    psi_unutra: null,
    psi_basta: null,
    max_velicina: 'svi',
    radno_vreme: null,
    kratak_opis: null,
    premium: false,
    poslednja_provera: null,
    voda_za_pse: null,
    hlad: null,
    ogradjeno: null,
    ...extra,
  };
}

/** Belgrade "dan" candidates around Knez Mihailova. */
function belgradeCandidates() {
  return [
    place(1000001, 'park', 44.8231, 20.4511, { ogradjeno: true }),
    place(1000002, 'park', 44.8001, 20.4801),
    place(11, 'kafic', 44.8180, 20.4560, { radno_vreme: WEEK, psi_unutra: true, voda_za_pse: true }),
    place(12, 'kafic', 44.8000, 20.4790, { radno_vreme: WEEK }),
    place(21, 'restoran', 44.8170, 20.4580, { radno_vreme: WEEK, psi_unutra: true }),
    place(22, 'restoran', 44.7990, 20.4810, { radno_vreme: WEEK, psi_unutra: false }),
    place(31, 'bar', 44.8150, 20.4600, { radno_vreme: WEEK }),
  ];
}

/** Kopaonik "zimovanje" candidates. */
function kopaonikCandidates() {
  return [
    place(101, 'smestaj', 43.2860, 20.8100, { pas_sme_sam_u_sobi: true }),
    place(102, 'smestaj', 43.2870, 20.8110, { pas_sme_sam_u_sobi: null }),
    place(103, 'smestaj', 43.2880, 20.8120, { pas_sme_sam_u_sobi: false }),
    place(104, 'smestaj', 43.2890, 20.8130),
    place(201, 'restoran', 43.2861, 20.8101, { psi_unutra: true, radno_vreme: WEEK }),
    place(202, 'restoran', 43.2950, 20.8200, { psi_unutra: true, radno_vreme: WEEK }),
    place(1000301, 'staza', 43.2900, 20.8000),
    place(1000302, 'staza', 43.2700, 20.8300),
    place(2000001, 'veterinar', 43.4000, 20.7000),
    place(2000002, 'veterinar', 43.2950, 20.8150),
  ];
}

/** A compact MET forecast with hourly steps on `date` (UTC times). */
function metForecast(date, { temp = 15, precipitation = 0, symbol = 'clearsky_day' } = {}) {
  const timeseries = [];
  for (let hour = 0; hour < 24; hour++) {
    timeseries.push({
      time: `${date}T${String(hour).padStart(2, '0')}:00:00Z`,
      data: {
        instant: { details: { air_temperature: typeof temp === 'function' ? temp(hour) : temp } },
        next_1_hours: { summary: { symbol_code: symbol }, details: { precipitation_amount: precipitation } },
      },
    });
  }
  return { properties: { timeseries } };
}

module.exports = { place, WEEK, WEEK_JSON, belgradeCandidates, kopaonikCandidates, metForecast };
