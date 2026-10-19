import { pluralForm } from '@gde/shared/util';
import content from './winter-content.json';
import type { DogSize, WinterDestinationData, WinterDogFee, WinterLift } from './winter-data';
import type { WinterDestination } from './winter-pages';

/**
 * Words of the winter pages. Static text says nothing about a particular
 * place; every sentence about a place is built from its data and left out
 * when that data is missing.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface EuSection {
  heading: string;
  paragraphs?: string[];
  items?: string[];
}

interface WinterContent {
  intros: Record<string, string[]>;
  euTravel: { intro: string[]; sections: EuSection[]; faq: FaqItem[] };
}

export const WINTER_CONTENT = content as unknown as WinterContent;

/** The editor's introduction ('hub' or a destination slug); empty until written. */
export function introFor(key: string): string[] {
  return (WINTER_CONTENT.intros[key] ?? []).filter((paragraph) => paragraph.trim());
}

export const PACKING_LIST: readonly string[] = [
  'Povodac i ogrlica ili am sa pločicom na kojoj je tvoj broj telefona.',
  'Reflektujuća oprema ili svetleća ogrlica za kratke zimske dane.',
  'Kaput ili džemper za pse kratke dlake i male pse.',
  'Zaštita za šape od snega i soli: čizmice ili zaštitni melem.',
  'Peškir za brisanje šapa i krzna posle šetnje.',
  'Hrana za sve dane boravka i posude za vodu i hranu.',
  'Prostirka ili ćebe koje tvoj pas poznaje.',
  'Kesice za otpatke.',
  'Pasoš ljubimca ili knjižica vakcinacije.',
  'Adresa i telefon najbližeg veterinara.',
];

/** '2026-10-20' → '20. 10. 2026.' */
export function formatDate(date: string | null): string | null {
  const match = date ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(date) : null;
  return match ? `${Number(match[3])}. ${Number(match[2])}. ${match[1]}.` : null;
}

/** 1500 RSD → '1.500 RSD', 7.5 EUR → '7,50 €'. */
export function formatFee(fee: WinterDogFee): string {
  const amount =
    fee.currency === 'EUR'
      ? `${fee.amount.toFixed(Number.isInteger(fee.amount) ? 0 : 2).replace('.', ',')} €`
      : `${Math.round(fee.amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')} RSD`;
  return `${amount} ${fee.per === 'noc' ? 'po noći' : 'po boravku'}`;
}

export function dogSizeLabel(size: DogSize): string {
  return size === 'mali' ? 'samo mali psi' : size === 'srednji' ? 'mali i srednji psi' : 'psi svih veličina';
}

export function formatKm(km: number): string {
  return `${km.toFixed(1).replace('.', ',')} km`;
}

const STAY_FORMS = { one: 'smeštaj', few: 'smeštaja', many: 'smeštaja' };
const RESTAURANT_FORMS = { one: 'restoran', few: 'restorana', many: 'restorana' };

export function countStays(n: number): string {
  return `${n} ${STAY_FORMS[pluralForm(n, 'sr')]}`;
}

export function countRestaurants(n: number): string {
  return `${n} ${RESTAURANT_FORMS[pluralForm(n, 'sr')]}`;
}

/** "A", "A i B", "A, B i C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} i ${names[names.length - 1]}`;
}

/** "Psi smeju (provereno 20. 10. 2026.)", or null when the rule is not in the database. */
export function liftStatus(lift: WinterLift): string | null {
  if (lift.dogsAllowed === null) return null;
  const verdict = lift.dogsAllowed ? 'Psi smeju' : 'Psi ne smeju';
  const checked = formatDate(lift.checkedAt);
  return checked ? `${verdict} (provereno ${checked})` : verdict;
}

function liftAnswer(lift: WinterLift, what: string): string | null {
  if (lift.dogsAllowed === null) return null;
  const checked = formatDate(lift.checkedAt);
  const source = checked ? `Prema našoj proveri od ${checked}` : 'Prema našim podacima';
  return lift.dogsAllowed ? `Da. ${source} psi smeju ${what}.` : `Ne. ${source} psi ne smeju ${what}.`;
}

/** FAQ of a destination page; a question whose answer would need missing data is left out. */
export function destinationFaq(destination: WinterDestination, data: WinterDestinationData): FaqItem[] {
  const faq: FaqItem[] = [];
  const { locative } = destination;

  if (data.stays.length) {
    const n = data.stays.length;
    faq.push({
      question: `Koliko smeštaja ${locative} prima pse?`,
      answer: `Na Gde sa psom trenutno ima ${countStays(n)} ${locative} ${n === 1 ? 'koji prima' : 'koji primaju'} pse. Kod svakog navodimo doplatu, najveći broj pasa i da li pas sme sam u sobi, kada su ti podaci provereni.`,
    });
  }

  const alone = data.stays.filter((stay) => stay.dogMayStayAlone === true).map((stay) => stay.name);
  if (alone.length) {
    faq.push({
      question: `Gde ${locative} pas sme da ostane sam u sobi?`,
      answer: `Prema našim podacima to je dozvoljeno u: ${joinNames(alone.slice(0, 5))}.`,
    });
  }

  const gondola = liftAnswer(data.gondola, 'na gondolu');
  if (gondola) faq.push({ question: `Da li psi smeju na gondolu ${locative}?`, answer: gondola });

  const lifts = liftAnswer(data.skiLifts, 'na žičare');
  if (lifts) faq.push({ question: `Da li psi smeju na žičare ${locative}?`, answer: lifts });

  if (data.restaurants.length) {
    const names = data.restaurants.slice(0, 5).map((restaurant) => restaurant.name);
    faq.push({
      question: `U koje restorane ${locative} mogu sa psom unutra?`,
      answer: `Psi smeju unutra u: ${joinNames(names)}.${data.restaurants.length > names.length ? ' Celu listu imaš na ovoj stranici.' : ''}`,
    });
  }

  if (data.vet) {
    const parts = [data.vet.name, data.vet.address].filter(Boolean).join(', ');
    const distance = data.vet.distanceKm !== null ? ` Udaljen je oko ${formatKm(data.vet.distanceKm)} od centra.` : '';
    faq.push({ question: `Gde je najbliži veterinar?`, answer: `Najbliži veterinar u našoj bazi je ${parts}.${distance}` });
  }

  faq.push({
    question: 'Šta da spakujem psu za zimovanje?',
    answer: 'Toplu opremu za pse kratke dlake, zaštitu za šape od snega i soli, peškir, hranu za sve dane i pasoš ljubimca. Ceo spisak je na ovoj stranici.',
  });

  return faq;
}
