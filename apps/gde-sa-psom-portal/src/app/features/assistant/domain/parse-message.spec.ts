import { sampleGazetteer, TODAY } from './assistant-domain.fixtures';
import { addressNameCandidates, EMPTY_GAZETTEER, placeFromAddress } from './gazetteer';
import { parseMessage } from './parse-message';
import { EMPTY_CONTEXT, mergeTrip, nextContext, resolveStep, type AssistantContext } from './resolve-step';

const gazetteer = sampleGazetteer();
const parse = (text: string) => parseMessage(text, gazetteer, TODAY);
const placeOf = (text: string) => parse(text).place?.name ?? null;

describe('assistant gazetteer', () => {
  it.each([
    ['kafići u Beogradu', 'Beograd'],
    ['restoran Novi Sad', 'Novi Sad'],
    ['gde u Novom Sadu sa psom', 'Novi Sad'],
    ['u centru Novog Sada', 'Novi Sad'],
    ['veterinar u Nišu', 'Niš'],
    ['iz Kragujevca sam', 'Kragujevac'],
    ['park na Vračaru', 'Vračar'],
    ['kafić na Novom Beogradu', 'Novi Beograd'],
    ['restorani u Starom gradu', 'Stari grad'],
    ['smeštaj na Zlatiboru', 'Zlatibor'],
    ['u Čačku', 'Čačak'],
    ['vikend u Sremskim Karlovcima', 'Sremski Karlovci'],
    ['kafic na dorcolu', 'Stari grad'],
    ['šetnja na Adi Ciganliji', 'Čukarica'],
    ['beogradski kafići', 'Beograd'],
    ['cafes in Belgrade', 'Beograd'],
    ['kafići u Šapcu', 'Šabac'],
  ])('finds the place in "%s"', (text, name) => {
    expect(placeOf(text)).toBe(name);
  });

  it('reads a case form of a one-word name only after a preposition', () => {
    expect(placeOf('nisu dozvoljeni psi u kafiću')).toBeNull();
    expect(placeOf('kafić Niš')).toBe('Niš');
  });

  it('does not take "na Adi" for the town of Ada', () => {
    expect(placeOf('na Adi')).toBeNull();
    expect(placeOf('smeštaj u Adi')).toBeNull();
    expect(placeOf('Ada')).toBe('Ada');
  });

  it('gives a city all of its townships', () => {
    expect(parse('kafići Beograd').place?.townshipIds).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it('keeps the Belgrade Palilula apart from the one in Niš when the city is known', () => {
    expect(gazetteer.lookup('Palilula', 'Beograd')?.townshipIds).toEqual([6]);
    expect(gazetteer.lookup('Palilula')?.townshipIds).toEqual([6, 31]);
  });

  it('reads the area names OpenStreetMap gives for a point', () => {
    // What Nominatim answers for a point on Vračar (suburb, city, county).
    expect(placeFromAddress(['Beograd (Vračar)', 'Gradska opština Vračar', 'Grad Beograd'], gazetteer)?.townshipIds).toEqual([1]);
    expect(addressNameCandidates('Beograd (Vračar)')).toEqual(['Vračar', 'Beograd']);
    expect(addressNameCandidates('Градска општина Врачар')).toEqual(['Vračar']);
    // A township two cities share is narrowed by the city among the names.
    expect(placeFromAddress(['Palilula', 'Grad Niš'], gazetteer)?.townshipIds).toEqual([31]);
    // A city without a known township is the city itself.
    expect(placeFromAddress(['Neko naselje', 'Grad Kragujevac'], gazetteer)?.name).toBe('Kragujevac');
    expect(placeFromAddress(['Bratislava'], gazetteer)).toBeNull();
  });

  it('looks up names the AI gives, in any case form', () => {
    expect(gazetteer.lookup('Novom Sadu')?.name).toBe('Novi Sad');
    expect(gazetteer.lookup('stari grad', 'Beograd')?.townshipIds).toEqual([2]);
    expect(gazetteer.lookup('Dorćol')?.name).toBe('Stari grad');
    expect(gazetteer.lookup('Atlantida')).toBeNull();
  });
});

describe('assistant parser: places', () => {
  it('reads the example from the brief', () => {
    const parsed = parse('hoću da idem u Beograd u kafić');
    expect(parsed.kind).toBe('places');
    expect(parsed.categories).toEqual(['cafe']);
    expect(parsed.place?.name).toBe('Beograd');
  });

  it.each([
    ['gde na kafu sa psom', ['cafe']],
    ['ručak sa psom', ['restaurant']],
    ['doručak', ['cafe', 'restaurant']],
    ['na piće', ['bar']],
    ['pab', ['bar']],
    ['hotel koji prima pse', ['stay']],
    ['apartmani', ['stay']],
    ['park za pse', ['park']],
    ['gde da prošetam psa', ['park']],
    ['dežurni veterinar', ['vet']],
    ['čipovanje psa', ['vet']],
    ['pet shop', ['petshop']],
    ['hrana za pse', ['petshop']],
    ['kafić i park', ['cafe', 'park']],
  ])('reads the category of "%s"', (text, categories) => {
    expect(parse(text).categories).toEqual(categories);
  });

  it('does not take a parking lot for a park', () => {
    expect(parse('parking').categories).toEqual([]);
  });

  it.each([
    ['sa malim psom', 'small'],
    ['imam malog psa', 'small'],
    ['štene od 4 meseca', 'puppy'],
    ['veliki pas', 'large'],
    ['sa srednjim psom', 'large'],
    ['labrador', 'large'],
    ['čivava', 'small'],
    ['pas od 30 kg', 'large'],
    ['kuca od 6 kg', 'small'],
  ])('reads the dog in "%s"', (text, size) => {
    expect(parse(text).dogSize).toBe(size);
  });

  it('reads a garden, near me and a radius', () => {
    expect(parse('kafić sa baštom').garden).toBe(true);
    expect(parse('restoran sa terasom').garden).toBe(true);
    const near = parse('veterinar blizu mene u krugu od 5 km');
    expect(near.nearMe).toBe(true);
    expect(near.radius).toBe(5000);
    expect(parse('najbliži park').nearMe).toBe(true);
  });

  it('reports a place it cannot find, as typed', () => {
    const parsed = parse('kafić na Zlatnom Brdu');
    expect(parsed.place).toBeNull();
    expect(parsed.unknownPlace).toBe('Zlatnom Brdu');
  });

  it('does not report common words after a preposition as places', () => {
    expect(parse('gde na kafu').unknownPlace).toBeNull();
    expect(parse('restoran u centru').unknownPlace).toBeNull();
    expect(parse('smeštaj u Srbiji').unknownPlace).toBeNull();
    expect(parse('kafić za velikog psa').unknownPlace).toBeNull();
  });

  it('reads every venue type on purpose', () => {
    const parsed = parse('šta ima pet friendly u Nišu');
    expect(parsed.kind).toBe('places');
    expect(parsed.anyCategory).toBe(true);
    expect(parsed.categories).toEqual([]);
  });

  it('keeps a trip inside Serbia a place search', () => {
    const parsed = parse('putujem u Novi Sad, gde mogu da spavam sa psom');
    expect(parsed.kind).toBe('places');
    expect(parsed.categories).toEqual(['stay']);
  });

  it('works without the lookups, minus the places', () => {
    const parsed = parseMessage('kafići u Beogradu', EMPTY_GAZETTEER, TODAY);
    expect(parsed.categories).toEqual(['cafe']);
    expect(parsed.place).toBeNull();
  });
});

describe('assistant parser: trips', () => {
  it('reads a trip abroad with its date and transport', () => {
    const parsed = parse('idem kolima u Hrvatsku 20. decembra sa psom');
    expect(parsed.kind).toBe('trip');
    expect(parsed.trip).toMatchObject({ destination: 'HR', transport: 'car', departureDate: '2026-12-20' });
  });

  it.each([
    ['putujem avionom u Grčku 15.7.', { destination: 'GR', transport: 'plane', departureDate: '2027-07-15' }],
    ['u Crnu Goru za vikend', { destination: 'ME', departureDate: '2026-11-28' }],
    ['Budva za dve nedelje', { destination: 'ME', departureDate: '2026-12-10' }],
    ['od 10. do 20. jula u Italiju', { destination: 'IT', departureDate: '2027-07-10', returnDate: '2027-07-20' }],
    ['Nemačka, nedelju dana, 2 psa', { destination: 'DE', nights: 7, dogs: 2 }],
    ['trip to Croatia on 3 January', { destination: 'HR', departureDate: '2027-01-03' }],
    ['šta mi treba za Beč', { destination: 'AT' }],
  ])('reads "%s"', (text, expected) => {
    const parsed = parse(text);
    expect(parsed.kind).toBe('trip');
    expect(parsed.trip).toMatchObject(expected);
  });

  it('asks where when only the travelling is clear', () => {
    const parsed = parse('idem na more sa psom');
    expect(parsed.kind).toBe('trip');
    expect(parsed.trip?.destination).toBeNull();
  });

  it('does not read weights or decimals as dates', () => {
    expect(parse('pas od 7.5 kg za Grčku').trip?.departureDate).toBeNull();
  });

  it('skips dates in the past', () => {
    expect(parse('Hrvatska 1.1.2025.').trip?.departureDate).toBeNull();
  });
});

describe('assistant parser: small talk', () => {
  it.each([
    ['zdravo', 'greeting'],
    ['Ćao!', 'greeting'],
    ['hvala!', 'thanks'],
    ['šta možeš', 'help'],
    ['koja je najbolja hrana za štence', 'places'],
    ['asdfgh', 'unknown'],
  ])('"%s" is %s', (text, kind) => {
    expect(parse(text).kind).toBe(kind);
  });
});

describe('assistant resolver', () => {
  const step = (text: string, context: AssistantContext = EMPTY_CONTEXT) => resolveStep(parse(text), context);

  /** The step for the last message, after the ones before it. */
  function converse(...messages: string[]) {
    let context = EMPTY_CONTEXT;
    let last = resolveStep(parse(''), context);
    for (const message of messages) {
      last = step(message, context);
      context = nextContext(context, last);
    }
    return last;
  }

  it('searches when it knows what and where', () => {
    expect(step('kafići u Beogradu')).toMatchObject({ type: 'search', query: { categories: ['cafe'] } });
  });

  it('asks for the place, then completes the search with the answer', () => {
    expect(step('kafić sa baštom')).toMatchObject({ type: 'ask-place', unknownPlace: null });
    expect(converse('kafić sa baštom', 'Novi Sad')).toMatchObject({
      type: 'search',
      query: { categories: ['cafe'], garden: true, place: { name: 'Novi Sad' } },
    });
  });

  it('searches stays across Serbia without asking', () => {
    expect(step('pet friendly hotel')).toMatchObject({ type: 'search', query: { place: null, categories: ['stay'] } });
  });

  it('keeps the city for a follow-up about another category', () => {
    expect(converse('kafići u Nišu', 'a restorani?')).toMatchObject({
      type: 'search',
      query: { categories: ['restaurant'], place: { name: 'Niš' } },
    });
  });

  it('keeps the category for a follow-up about another city, and the dog for both', () => {
    expect(converse('restoran za velikog psa u Beogradu', 'a u Novom Sadu?')).toMatchObject({
      type: 'search',
      query: { categories: ['restaurant'], place: { name: 'Novi Sad' }, dogSize: 'large' },
    });
  });

  it('lists every venue type of a place when no category was ever given', () => {
    expect(step('šta ima u Zemunu')).toMatchObject({ type: 'search', query: { categories: [], place: { name: 'Zemun' } } });
  });

  it('asks what when the message is only a detail', () => {
    expect(step('sa baštom')).toMatchObject({ type: 'ask-category' });
  });

  it('asks for the place it could not find', () => {
    expect(step('kafić na Zlatnom Brdu')).toMatchObject({ type: 'ask-place', unknownPlace: 'Zlatnom Brdu' });
  });

  it('asks for the destination, then plans with the answer', () => {
    expect(step('idem na more 1. jula')).toMatchObject({ type: 'ask-destination' });
    expect(converse('idem na more 1. jula', 'Grčka')).toMatchObject({
      type: 'trip',
      query: { destination: 'GR', departureDate: '2027-07-01' },
    });
  });

  it('adds a date to the trip being discussed', () => {
    expect(converse('put u Hrvatsku kolima', '20.12.')).toMatchObject({
      type: 'trip',
      query: { destination: 'HR', transport: 'car', departureDate: '2026-12-20' },
    });
  });

  it('starts over for a new country, keeping only the dogs', () => {
    expect(converse('Hrvatska 20.12. sa 2 psa', 'a Grčka?')).toMatchObject({
      type: 'trip',
      query: { destination: 'GR', departureDate: null, dogs: 2 },
    });
  });

  it('answers small talk and gives up on gibberish', () => {
    expect(step('hvala')).toEqual({ type: 'reply', reply: 'thanks' });
    expect(step('asdfgh')).toEqual({ type: 'not-understood' });
  });

  it('derives the return date from the trip length', () => {
    expect(mergeTrip(null, { destination: 'HR', transport: null, departureDate: '2026-12-20', returnDate: null, nights: 7, dogs: null }).returnDate).toBe(
      '2026-12-27',
    );
  });
});
