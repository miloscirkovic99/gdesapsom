import { placeLocative, pluralForm } from '@gde/shared/util';
import { type CountryCode, countryName } from '../pet-trip/domain/countries';
import type { Lang } from '../pet-trip/domain/lang';
import type { AiQuotaReason } from './ai/assistant-ai.models';
import type { DogRule, SearchScope } from './data/place-results';
import type { CategoryId, DogSize } from './domain/query.models';

/**
 * The assistant's words, in Serbian (Latin script) and English; it follows
 * the site's language switch. It speaks as "we" (the site), which also keeps
 * Serbian verbs free of a grammatical gender ("našli smo").
 *
 * Kept out of rs.json / en.json like the trip planner's copy: only the
 * assistant's lazy chunk needs it.
 */

/** A suggestion the visitor can tap: it is sent as if typed. */
export interface Chip {
  label: string;
  /** What is sent; the label when missing. */
  text?: string;
}

const CATEGORY_SR: Record<CategoryId, string> = {
  cafe: 'Kafići',
  restaurant: 'Restorani',
  bar: 'Barovi i pabovi',
  stay: 'Smeštaj',
  park: 'Parkovi za pse',
  vet: 'Veterinari',
  petshop: 'Pet shopovi',
};

const CATEGORY_EN: Record<CategoryId, string> = {
  cafe: 'Cafés',
  restaurant: 'Restaurants',
  bar: 'Bars and pubs',
  stay: 'Places to stay',
  park: 'Dog parks',
  vet: 'Vets',
  petshop: 'Pet shops',
};

/** "u Novom Sadu", or "· Ruma" for a place whose case form we do not know. */
function whereSr(scope: SearchScope): string {
  if (scope.kind === 'near') return `u krugu od ${Math.round(scope.radius / 1000)} km`;
  if (scope.kind === 'serbia') return 'u Srbiji';
  const locative = placeLocative(scope.place.name);
  if (locative) return locative;
  const city = scope.place.kind === 'township' && scope.place.cityNames.length === 1 ? `, ${scope.place.cityNames[0]}` : '';
  return `· ${scope.place.name}${city}`;
}

function whereEn(scope: SearchScope): string {
  if (scope.kind === 'near') return `within ${Math.round(scope.radius / 1000)} km`;
  if (scope.kind === 'serbia') return 'in Serbia';
  const city = scope.place.kind === 'township' && scope.place.cityNames.length === 1 ? `, ${scope.place.cityNames[0]}` : '';
  return `in ${scope.place.name}${city}`;
}

const PLACE_FORMS_SR = { one: 'mesto', few: 'mesta', many: 'mesta' } as const;
const placesSr = (count: number) => PLACE_FORMS_SR[pluralForm(count, 'sr')];

/** "Preko Mađarske i Austrije" inside a sentence: only the first letter drops, the countries keep theirs. */
const midSentence = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

const SR = {
  launcher: 'Pitaj Gde sa psom',
  title: 'Gde sa psom',
  subtitle: 'Pretraga mesta za tebe i psa',
  close: 'Zatvori',
  newChat: 'Novi razgovor',
  inputLabel: 'Tvoja poruka',
  placeholder: 'Npr. kafić sa baštom u Novom Sadu',
  send: 'Pošalji',
  thinking: 'Tražimo…',
  welcome:
    'Zdravo! Napiši gde ideš i šta tražiš, a mi ćemo ti pokazati pet friendly mesta iz naše baze. Možeš i da pitaš šta psu treba za put u inostranstvo.',
  welcomeChips: [
    { label: 'Kafići u Beogradu' },
    { label: 'Park za pse blizu mene' },
    { label: 'Veterinar u Nišu' },
    { label: 'Smeštaj sa psom na Zlatiboru' },
    { label: 'Put u Hrvatsku kolima' },
  ] as Chip[],
  footer: 'Mesta su iz baze Gde sa psom. Uslove za pse proveri sa objektom pre dolaska.',

  category: (category: CategoryId | null) => (category ? CATEGORY_SR[category] : 'Pet friendly mesta'),
  groupTitle: (category: CategoryId | null, scope: SearchScope) =>
    `${category ? CATEGORY_SR[category] : 'Pet friendly mesta'} ${whereSr(scope)}`,
  nearTitle: (category: CategoryId | null) => `${category ? CATEGORY_SR[category] : 'Pet friendly mesta'} u tvojoj blizini`,
  widened: (township: string, city: string) => `U opštini ${township} nemamo nijedno, pa prikazujemo ceo grad ${city}.`,
  empty: (category: CategoryId | null) =>
    `${category ? CATEGORY_SR[category] : 'Pet friendly mesta'}: za ovu pretragu u bazi nemamo nijedno mesto.`,
  emptyFiltered: 'Probaj bez nekog filtera, ili u drugom mestu.',
  shown: (count: number) => `${count} ${placesSr(count)}`,
  more: 'Prikaži još',
  loadingMore: 'Učitavamo…',
  openList: 'Otvori celu listu',
  details: 'Detalji',
  directions: 'Navigacija',
  call: 'Pozovi',
  distance: (metres: number) => (metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1).replace('.', ',')} km`),
  gardenYes: 'Ima baštu',
  gardenNo: 'Bez bašte',
  dogs: { small: 'Mali psi', 'small-puppies': 'Mali psi i štenci većih rasa', all: 'Sve veličine' } satisfies Record<DogRule, string>,
  filters: {
    garden: 'Sa baštom',
    dog: { small: 'Mali pas', puppy: 'Štene', large: 'Srednji ili veliki pas' } satisfies Record<DogSize, string>,
    /** Parks and vets are found by the township around the visitor, so they show no radius. */
    near: (radius: number | null) => (radius ? `Blizu mene · ${Math.round(radius / 1000)} km` : 'Blizu mene'),
    remove: (label: string) => `Ukloni filter: ${label}`,
  },
  aiNote: 'Poruku smo protumačili uz pomoć AI; mesta su iz naše baze.',
  aiQuota: {
    device: 'Danas smo potrošili AI pomoć za ovaj uređaj. Jasne poruke (npr. „kafići Beograd“) i dalje rade.',
    network: 'Danas smo potrošili AI pomoć za ovu mrežu. Jasne poruke (npr. „kafići Beograd“) i dalje rade.',
    global: 'AI pomoć je za danas potrošena. Jasne poruke (npr. „kafići Beograd“) i dalje rade.',
  } satisfies Record<AiQuotaReason, string>,

  askPlace: (categories: CategoryId[]) =>
    categories.length ? `${categories.map((category) => CATEGORY_SR[category]).join(' i ')}: u kom gradu ili opštini?` : 'U kom gradu ili opštini?',
  unknownPlace: (name: string) => `Mesto „${name}“ nemamo u bazi. Napiši grad ili opštinu, ili izaberi:`,
  askCategory: 'Šta tražiš?',
  categoryChips: [
    { label: 'Kafići' },
    { label: 'Restorani' },
    { label: 'Smeštaj' },
    { label: 'Parkovi za pse' },
    { label: 'Veterinari' },
    { label: 'Pet shop' },
  ] as Chip[],
  placeChips: [{ label: 'Beograd' }, { label: 'Novi Sad' }, { label: 'Niš' }, { label: 'Blizu mene' }] as Chip[],
  notUnderstood: 'Nismo sigurni šta tražiš. Napiši vrstu mesta i grad, na primer:',
  greeting: 'Zdravo! Šta tražiš danas: kafić, restoran, park, veterinara ili smeštaj?',
  thanks: 'Nema na čemu! Javi ako tražiš još nešto.',
  help:
    'Pronalazimo pet friendly kafiće, restorane, barove, smeštaj, parkove za pse, veterinare i pet shopove iz naše baze, po gradu, opštini ili u tvojoj blizini. Možeš da dodaš veličinu psa ili baštu. Za put u inostranstvo pokazujemo šta psu treba i otvaramo planer.',
  error: 'Pretraga trenutno ne radi. Pokušaj ponovo za koji trenutak.',
  retry: 'Pokušaj ponovo',

  locating: 'Tražimo tvoju lokaciju…',
  locationDenied: 'Bez dozvole za lokaciju ne možemo da tražimo u blizini. Napiši grad ili opštinu:',
  locationUnavailable: 'Lokacija trenutno nije dostupna. Napiši grad ili opštinu:',
  nearPlaceUnknown: 'Za parkove i veterinare treba nam grad, a tvoj nismo prepoznali. Napiši grad ili opštinu:',
  widerRadius: (km: number) => `U krugu od ${km} km`,

  tripTitle: 'Put sa psom',
  tripRoute: (route: string) => `Ruta: ${midSentence(route)} (možeš da je promeniš u planeru).`,
  tripEarliest: (date: string) => `Najraniji mogući polazak po proverenim pravilima: ${date}.`,
  tripMissingDate: 'Uz datum polaska izračunaćemo tačne rokove.',
  tripMore: (count: number) => `Još ${count} u planeru.`,
  tripDogData: 'Rokovi zavise od čipa i vakcine psa: unesi ih u planeru.',
  tripOpen: 'Otvori planer sa ovim podacima',
  askDestination: 'U koju zemlju putuješ?',
  country: (code: CountryCode) => countryName(code, 'sr'),
};

export type AssistantCopy = typeof SR;

const placesEn = (count: number) => (count === 1 ? 'place' : 'places');

const EN: AssistantCopy = {
  launcher: 'Ask Gde sa psom',
  title: 'Gde sa psom',
  subtitle: 'Find places for you and your dog',
  close: 'Close',
  newChat: 'New chat',
  inputLabel: 'Your message',
  placeholder: 'E.g. café with a garden in Novi Sad',
  send: 'Send',
  thinking: 'Searching…',
  welcome:
    "Hi! Tell us where you're going and what you're looking for, and we'll show you pet-friendly places from our database. You can also ask what your dog needs for a trip abroad.",
  welcomeChips: [
    { label: 'Cafés in Belgrade' },
    { label: 'Dog park near me' },
    { label: 'Vet in Niš' },
    { label: 'Dog-friendly stay on Zlatibor', text: 'Places to stay on Zlatibor' },
    { label: 'Trip to Croatia by car' },
  ],
  footer: 'Places come from the Gde sa psom database. Check the rules for dogs with the venue before you go.',

  category: (category) => (category ? CATEGORY_EN[category] : 'Pet-friendly places'),
  groupTitle: (category, scope) => `${category ? CATEGORY_EN[category] : 'Pet-friendly places'} ${whereEn(scope)}`,
  nearTitle: (category) => `${category ? CATEGORY_EN[category] : 'Pet-friendly places'} near you`,
  widened: (township, city) => `We have none in ${township}, so here is all of ${city}.`,
  empty: (category) => `${category ? CATEGORY_EN[category] : 'Pet-friendly places'}: we have no place for this search.`,
  emptyFiltered: 'Try without one of the filters, or somewhere else.',
  shown: (count) => `${count} ${placesEn(count)}`,
  more: 'Show more',
  loadingMore: 'Loading…',
  openList: 'Open the full list',
  details: 'Details',
  directions: 'Directions',
  call: 'Call',
  distance: (metres) => (metres < 1000 ? `${Math.round(metres / 10) * 10} m` : `${(metres / 1000).toFixed(1)} km`),
  gardenYes: 'Has a garden',
  gardenNo: 'No garden',
  dogs: { small: 'Small dogs', 'small-puppies': 'Small dogs and large-breed puppies', all: 'All sizes' },
  filters: {
    garden: 'With a garden',
    dog: { small: 'Small dog', puppy: 'Puppy', large: 'Medium or large dog' },
    near: (radius) => (radius ? `Near me · ${Math.round(radius / 1000)} km` : 'Near me'),
    remove: (label) => `Remove filter: ${label}`,
  },
  aiNote: 'We read your message with the help of AI; the places come from our database.',
  aiQuota: {
    device: "We've used up today's AI help for this device. Clear messages (like “cafés Belgrade”) still work.",
    network: "We've used up today's AI help for this network. Clear messages (like “cafés Belgrade”) still work.",
    global: "Today's AI help is used up. Clear messages (like “cafés Belgrade”) still work.",
  },

  askPlace: (categories) =>
    categories.length ? `${categories.map((category) => CATEGORY_EN[category]).join(' and ')}: in which city or municipality?` : 'In which city or municipality?',
  unknownPlace: (name) => `We don't have “${name}” in our database. Write a city or municipality, or pick one:`,
  askCategory: 'What are you looking for?',
  categoryChips: [
    { label: 'Cafés' },
    { label: 'Restaurants' },
    { label: 'Places to stay' },
    { label: 'Dog parks' },
    { label: 'Vets' },
    { label: 'Pet shop' },
  ],
  placeChips: [{ label: 'Belgrade' }, { label: 'Novi Sad' }, { label: 'Niš' }, { label: 'Near me' }],
  notUnderstood: "We're not sure what you're looking for. Write a kind of place and a city, for example:",
  greeting: 'Hi! What are you looking for today: a café, a restaurant, a park, a vet or a place to stay?',
  thanks: "You're welcome! Let us know if you need anything else.",
  help:
    'We find pet-friendly cafés, restaurants, bars, places to stay, dog parks, vets and pet shops from our database, by city, municipality or near you. You can add your dog’s size or a garden. For a trip abroad we show what your dog needs and open the planner.',
  error: "Search isn't working right now. Please try again in a moment.",
  retry: 'Try again',

  locating: 'Finding your location…',
  locationDenied: "Without location access we can't search near you. Write a city or municipality:",
  locationUnavailable: "Your location isn't available right now. Write a city or municipality:",
  nearPlaceUnknown: "For parks and vets we need a city, and we couldn't tell yours. Write a city or municipality:",
  widerRadius: (km) => `Within ${km} km`,

  tripTitle: 'Travelling with a dog',
  tripRoute: (route) => `Route: ${midSentence(route)} (you can change it in the planner).`,
  tripEarliest: (date) => `Earliest departure under the checked rules: ${date}.`,
  tripMissingDate: "With a departure date we'll work out the exact deadlines.",
  tripMore: (count) => `${count} more in the planner.`,
  tripDogData: "Deadlines depend on your dog's microchip and vaccination: add them in the planner.",
  tripOpen: 'Open the planner with these details',
  askDestination: 'Which country are you travelling to?',
  country: (code) => countryName(code, 'en'),
};

export const ASSISTANT_COPY: Readonly<Record<Lang, AssistantCopy>> = { sr: SR, en: EN };

/**
 * What a reply says, without the words. Replies keep this rather than text,
 * so the whole conversation (also one restored after a page change) is
 * shown in the language the site is in now, not the one it was in then.
 */
export type Say =
  | {
      key:
        | 'welcome'
        | 'greeting'
        | 'thanks'
        | 'help'
        | 'notUnderstood'
        | 'askCategory'
        | 'askDestination'
        | 'locationDenied'
        | 'locationUnavailable'
        | 'nearPlaceUnknown';
    }
  | { key: 'askPlace'; categories: CategoryId[] }
  | { key: 'unknownPlace'; name: string };

/** The suggestions under a reply, rendered (and sent) in the current language. */
export type ChipSet =
  | { set: 'none' }
  | { set: 'welcome' }
  | { set: 'category' }
  /** Cities, and "near me" unless the location is what failed. */
  | { set: 'place'; nearMe: boolean }
  | { set: 'destination'; codes: CountryCode[] };

/** A note under a reply: the AI read the message, or its daily allowance is used up. */
export type Note = { kind: 'ai' } | { kind: 'quota'; reason: AiQuotaReason };

export function sayText(say: Say, copy: AssistantCopy): string {
  switch (say.key) {
    case 'askPlace':
      return copy.askPlace(say.categories);
    case 'unknownPlace':
      return copy.unknownPlace(say.name);
    default:
      return copy[say.key];
  }
}

export function chipsOf(chips: ChipSet, copy: AssistantCopy): Chip[] {
  switch (chips.set) {
    case 'welcome':
      return copy.welcomeChips;
    case 'category':
      return copy.categoryChips;
    case 'place':
      return chips.nearMe ? copy.placeChips : copy.placeChips.slice(0, -1);
    case 'destination':
      return chips.codes.map((code) => ({ label: copy.country(code) }));
    default:
      return [];
  }
}

export function noteText(note: Note | null, copy: AssistantCopy): string | null {
  if (!note) return null;
  return note.kind === 'ai' ? copy.aiNote : copy.aiQuota[note.reason];
}
