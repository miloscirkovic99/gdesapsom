/**
 * The plan without AI: what the user gets when every provider failed or the
 * budget is spent. Same shape as a model's plan, built only from candidate
 * data, so it passes the same validation.
 *
 * "dan":       morning walk → café → lunch → afternoon walk, each stop the
 *              nearest open candidate to the previous one.
 * "zimovanje": the three best stays; each day one trail, one restaurant;
 *              the nearest vet.
 */
const { PLAN_RULES, WEATHER } = require('./config');
const { nearest } = require('./geo');
const { isOpenAt } = require('./hours');
const { WALKS } = require('./candidates');

const DAN_SLOTS = [
  { kind: 'walk', time: '09:00', hotTime: '08:00', zasto: 'Jutarnja šetnja za dobar početak dana.' },
  { kind: 'kafic', time: '10:30', zasto: 'Pauza za kafu, u blizini prethodne stanice.' },
  { kind: 'restoran', time: '13:00', zasto: 'Ručak nedaleko od kafića.' },
  { kind: 'walk', time: '17:30', hotTime: '18:30', zasto: 'Popodnevna šetnja da se dan lepo završi.' },
];

function adviceFor(candidate, weather) {
  if (WALKS.includes(candidate.kategorija)) {
    if (weather && weather.tMax > WEATHER.hotC) return 'Ponesi vodu i pusti {{ime}} da odmara u hladu.';
    if (weather && weather.cold) return 'Kraća šetnja je dovoljna po ovoj hladnoći; obriši šape posle.';
    return 'Ponesi vodu i kesice za {{ime}}.';
  }
  if (candidate.voda_za_pse === true) return 'Ovde ima vode za pse.';
  return 'Ponesi činiju za vodu za {{ime}}.';
}

function stop(candidate, time, zasto, weather) {
  return { vreme: time, lokacija_id: Number(candidate.id), zasto, savet_za_psa: adviceFor(candidate, weather) };
}

/**
 * @param {object[]} candidates output of selectCandidates (best first)
 * @param {{ params: object, weather: object|null, date: string|null, center: {lat:number,lng:number} }} context
 */
function rulesPlan(candidates, context) {
  return context.params.mode === 'dan' ? dayPlan(candidates, context) : winterPlan(candidates, context);
}

function dayPlan(candidates, context) {
  const hot = !!context.weather && context.weather.tMax > WEATHER.hotC;
  const used = new Set();
  const stanice = [];
  let from = context.center;

  for (const slot of DAN_SLOTS) {
    const time = hot && slot.hotTime ? slot.hotTime : slot.time;
    const pool = candidates.filter(
      (candidate) =>
        !used.has(candidate.id) &&
        (slot.kind === 'walk' ? WALKS.includes(candidate.kategorija) : candidate.kategorija === slot.kind) &&
        isOpenAt(candidate.radno_vreme, context.date, time) !== false,
    );
    // The first stop is the best-ranked walk; every later one is the nearest to where the dog just was.
    const pick = stanice.length === 0 ? pool[0] : nearest(from, pool);
    if (!pick) continue;
    used.add(pick.id);
    stanice.push(stop(pick, time, slot.zasto, context.weather));
    from = pick;
  }

  return {
    naslov: 'Dan sa psom po meri vremena',
    stanice,
    napomene: ['Plan je sastavljen bez AI asistenta, samo od mesta iz naše baze.'],
  };
}

function winterPlan(candidates, context) {
  const of = (category) => candidates.filter((candidate) => candidate.kategorija === category);
  const stays = of('smestaj').slice(0, PLAN_RULES.smestajMax);
  const trails = of('staza');
  const restaurants = of('restoran');
  const vet = nearest(context.center, of('veterinar'));
  const days = Math.max(1, context.params.broj_noci);

  const dani = [];
  for (let day = 0; day < days; day++) {
    const stanice = [];
    const trail = trails.length ? trails[day % trails.length] : null;
    if (trail) stanice.push(stop(trail, '10:00', 'Zimska šetnja po stazi sa liste.', context.weather));
    const restaurant = restaurants.length ? nearest(trail || context.center, rotate(restaurants, day)) : null;
    if (restaurant) stanice.push(stop(restaurant, '13:00', 'Ručak gde psi smeju unutra.', context.weather));
    if (stanice.length) dani.push({ dan: dani.length + 1, stanice });
  }

  return {
    naslov: 'Zimovanje sa psom',
    smestaj: stays.map((stay) => ({ lokacija_id: Number(stay.id), zasto: 'Među najbolje ocenjenim smeštajima koji primaju pse.' })),
    dani,
    veterinar_id: vet ? Number(vet.id) : null,
    napomene: ['Plan je sastavljen bez AI asistenta, samo od mesta iz naše baze.'],
  };
}

/** The list starting at `offset`, so consecutive days do not all get the same restaurant first. */
function rotate(list, offset) {
  const start = offset % list.length;
  return [...list.slice(start), ...list.slice(0, start)];
}

module.exports = { rulesPlan };
