import { pluralForm } from '@gde/shared/util';
import type { CostCategory, PrepItemId } from './costs';
import { joinList, type Lang } from './lang';

/**
 * Every label and sentence of the cost estimate and the comparison, in both
 * languages. Amounts, kilometres and dates arrive already formatted.
 */
export interface CostMessages {
  categories: Readonly<Record<CostCategory, string>>;
  prepItems: Readonly<Record<PrepItemId, string>>;
  /** Field names in "the value of field X is not valid". */
  fields: {
    rate: string;
    nights: string;
    tolls: string;
    accommodation: string;
    activities: string;
    other: string;
    contingency: string;
    distance: string;
    consumption: string;
    fuelPrice: string;
    extraKm: string;
    ticket: string;
    petFee: string;
    stayPetFee: string;
    foodPerson: string;
    foodDog: string;
  };
  invalidField(field: string): string;
  travelersMin: string;

  fuelMissing(distance: boolean, consumption: boolean, price: boolean): string;
  fuelDetail(input: { km: string; roundTrip: boolean; extraKm: string | null; consumption: string; price: string; estimated: boolean }): string;
  tollsMissing: string;
  tollsTotal: string;
  vignetteSkipped(country: string): string;
  vignetteNoRate(country: string): string;
  vignettePart(country: string, products: string, amount: string): string;
  vignetteConverted: string;
  vignetteEmission: string;
  vignettePriceUntil(date: string): string;
  pricesStale: string;
  vignetteAssumption: string;

  ticketMissing: string;
  ticketDetail(travelers: number, price: string, twice: boolean, direction: 'return' | 'both' | 'one'): string;
  airSerbiaNoRate: string;
  oneCarrier: string;
  cabinOnly(maxKg: number): string;
  airSerbiaDetail(fee: string, regional: boolean, dogs: number, flights: number): string;
  petFeeMissing: string;
  petFeePerDirection(dogs: number, fee: string, legs: number): string;
  petFeePerDog(dogs: number, fee: string): string;
  petFeeTotal(fee: string): string;

  accommodationMissing: string;
  accommodationDetail(nights: number, perNight: string): string;
  stayFeeMissing: string;
  stayFeePerNight(dogs: number, nights: number, fee: string): string;
  stayFeePerStay(dogs: number, fee: string): string;
  stayFeeOnce(fee: string): string;

  foodMissing: string;
  foodPeople(travelers: number, days: number, amount: string): string;
  foodDog(dogs: number, days: number, amount: string): string;
  foodWithoutPeople: string;
  foodWithoutDog: string;

  prepNone: string;
  prepAskVet(items: string): string;
  prepMissing(items: string): string;
  optionalMissing: string;
  optionalTotal: string;

  compare: {
    missing(scenario: string, categories: string): string;
    sharedMissing(category: string): string;
    optionalUneven(category: string, scenarios: readonly string[]): string;
    differentLengths(nights: readonly number[]): string;
    estimates: string;
  };
}

const FLIGHTS_SR = { one: 'let', few: 'leta', many: 'letova' } as const;
const daysSr = (days: number): string => `${days} ${pluralForm(days, 'rs') === 'one' ? 'dan' : 'dana'}`;

const SR: CostMessages = {
  categories: {
    fuel: 'Gorivo',
    tolls: 'Putarine',
    vignettes: 'Vinjete',
    tickets: 'Karte za putnike',
    'pet-transport': 'Prevoz psa',
    accommodation: 'Smeštaj',
    'accommodation-pet-fee': 'Doplata za psa u smeštaju',
    food: 'Hrana',
    activities: 'Aktivnosti',
    'vet-prep': 'Veterinar i dokumenta',
    other: 'Ostalo',
  },
  prepItems: {
    microchip: 'Ugradnja mikročipa',
    'rabies-vaccination': 'Vakcinacija protiv besnila',
    'vet-exam': 'Pregled i potvrda veterinara pred put',
    'health-certificate': 'Takse za veterinarski sertifikat',
    'titre-test': 'Test titra antitela na besnilo',
  },
  fields: {
    rate: 'kurs evra',
    nights: 'broj noćenja',
    tolls: 'putarine',
    accommodation: 'cena smeštaja',
    activities: 'aktivnosti',
    other: 'ostalo',
    contingency: 'rezerva',
    distance: 'udaljenost',
    consumption: 'potrošnja',
    fuelPrice: 'cena goriva',
    extraKm: 'dodatni kilometri',
    ticket: 'cena karte',
    petFee: 'doplata za prevoz psa',
    stayPetFee: 'doplata za psa u smeštaju',
    foodPerson: 'hrana po osobi',
    foodDog: 'hrana za psa',
  },
  invalidField: (field) => `Vrednost polja „${field}" nije ispravna i nije uračunata.`,
  travelersMin: 'Broj putnika mora biti najmanje 1.',

  fuelMissing: (distance, consumption, price) => {
    const missing = [distance ? 'udaljenost' : null, consumption ? 'potrošnju automobila' : null, price ? 'cenu goriva' : null];
    return `Za gorivo unesi ${missing.filter(Boolean).join(', ')}.`;
  },
  fuelDetail: ({ km, roundTrip, extraKm, consumption, price, estimated }) =>
    `${km}${roundTrip ? ' (tamo i nazad)' : ''}${extraKm ? `, uz ${extraKm} km na odredištu` : ''} × ${consumption} l/100 km × ${price} po litri.` +
    (estimated ? ' Udaljenost je procena sa mape: unesi tačnu iz planera rute.' : ''),
  tollsMissing:
    'Unesi ukupne putarine za ceo put. Srbija, Hrvatska, Severna Makedonija, Grčka i Italija naplaćuju putarinu po deonici.',
  tollsTotal: 'Ukupno za ceo put.',
  vignetteSkipped: (country) => `${country}: bez vinjete (tvoj izbor)`,
  vignetteNoRate: (country) => `Nema kursa za preračun cene vinjete (${country}); unesi je pod putarine.`,
  vignettePart: (country, products, amount) => `${country}, ${products}: ${amount}`,
  vignetteConverted: 'Cene u drugoj valuti su preračunate po referentnom kursu.',
  vignetteEmission: 'Rumunska vinjeta zavisi od Euro norme automobila: izaberi je za tačan iznos.',
  vignettePriceUntil: (date) => `Objavljena cena važi do ${date}; za kasnije datume važi novi cenovnik.`,
  pricesStale: 'Cene su proverene pre više meseci: potvrdi ih kod operatera.',
  vignetteAssumption:
    'Vinjete su računate za autoput na dan polaska i dan povratka. Ako se autoputem voziš i tokom boravka, izaberi dužu vinjetu.',

  ticketMissing: 'Unesi cenu karte po osobi.',
  ticketDetail: (travelers, price, twice, direction) =>
    `${travelers} × ${price}${twice ? ' × 2' : ''} (${direction === 'return' ? 'povratna karta' : direction === 'both' ? 'u oba pravca' : 'u jednom pravcu'})`,
  airSerbiaNoRate: 'Nema kursa za preračun cene Air Serbia.',
  oneCarrier: 'Air Serbia prima jedan transporter po putniku.',
  cabinOnly: (maxKg) =>
    `Air Serbia prevozi psa samo u kabini, do ${maxKg} kg zajedno sa transporterom; prevoz u prtljažnom prostoru nije objavljen.`,
  airSerbiaDetail: (fee, regional, dogs, flights) =>
    `Air Serbia: ${fee} po letu${regional ? ' (region)' : ' (Evropa)'} × ${dogs} × ${flights} ${FLIGHTS_SR[pluralForm(flights, 'rs')]}.`,
  petFeeMissing: 'Unesi doplatu prevoznika za psa (0 ako je nema).',
  petFeePerDirection: (dogs, fee, legs) => `${dogs} × ${fee} × ${legs} ${legs === 2 ? 'pravca' : 'pravac'}`,
  petFeePerDog: (dogs, fee) => `${dogs} × ${fee} po psu za ceo put`,
  petFeeTotal: (fee) => `Ukupno: ${fee}`,

  accommodationMissing: 'Unesi cenu smeštaja po noći.',
  accommodationDetail: (nights, perNight) => `${nights} × ${perNight} po noći`,
  stayFeeMissing: 'Pitaj smeštaj za doplatu za psa i unesi je (0 ako je nema).',
  stayFeePerNight: (dogs, nights, fee) => `${dogs} × ${nights} × ${fee} po psu i noći`,
  stayFeePerStay: (dogs, fee) => `${dogs} × ${fee} po psu za ceo boravak`,
  stayFeeOnce: (fee) => `${fee} za ceo boravak`,

  foodMissing: 'Nije uneto: dnevni budžet za hranu.',
  foodPeople: (travelers, days, amount) => `${travelers} × ${daysSr(days)} × ${amount}`,
  foodDog: (dogs, days, amount) => `hrana za psa ${dogs} × ${daysSr(days)} × ${amount}`,
  foodWithoutPeople: ' (bez hrane za putnike)',
  foodWithoutDog: ' (bez hrane za psa)',

  prepNone: 'Provera spremnosti ne traži dodatnu pripremu kod veterinara.',
  prepAskVet: (items) => `Pitaj veterinara za cenu: ${items}.`,
  prepMissing: (items) => ` Nedostaje cena: ${items}.`,
  optionalMissing: 'Nije uneto.',
  optionalTotal: 'Ukupan iznos.',

  compare: {
    missing: (scenario, categories) => `${scenario}: nedostaje ${categories}, pa je ukupan iznos samo donja granica.`,
    sharedMissing: (category) =>
      `${category}: deo cene nedostaje u svim varijantama isto, pa ne menja poređenje, ali su ukupni iznosi donja granica.`,
    optionalUneven: (category, scenarios) =>
      `${category}: iznos je unet samo za ${joinList(scenarios, 'sr')}. Unesi ga za sve varijante ili ni za jednu.`,
    differentLengths: (nights) => `Varijante traju različito (${nights.join(', ')} noćenja): uporedi i cenu po danu.`,
    estimates: 'Deo iznosa je procena, zato su ukupni iznosi rasponi.',
  },
};

const EN: CostMessages = {
  categories: {
    fuel: 'Fuel',
    tolls: 'Tolls',
    vignettes: 'Vignettes',
    tickets: 'Tickets',
    'pet-transport': 'Dog’s fare',
    accommodation: 'Accommodation',
    'accommodation-pet-fee': 'Pet fee at the accommodation',
    food: 'Food',
    activities: 'Activities',
    'vet-prep': 'Vet and documents',
    other: 'Other',
  },
  prepItems: {
    microchip: 'Microchip implant',
    'rabies-vaccination': 'Rabies vaccination',
    'vet-exam': 'Vet check and health statement before the trip',
    'health-certificate': 'Fees for the animal health certificate',
    'titre-test': 'Rabies antibody titre test',
  },
  fields: {
    rate: 'euro exchange rate',
    nights: 'number of nights',
    tolls: 'tolls',
    accommodation: 'accommodation price',
    activities: 'activities',
    other: 'other',
    contingency: 'contingency',
    distance: 'distance',
    consumption: 'fuel consumption',
    fuelPrice: 'fuel price',
    extraKm: 'extra kilometres',
    ticket: 'ticket price',
    petFee: 'carrier’s pet fee',
    stayPetFee: 'pet fee at the accommodation',
    foodPerson: 'food per person',
    foodDog: 'dog food',
  },
  invalidField: (field) => `The value in “${field}” is not valid and was left out.`,
  travelersMin: 'There must be at least 1 traveller.',

  fuelMissing: (distance, consumption, price) => {
    const missing = [distance ? 'the distance' : null, consumption ? 'the car’s fuel consumption' : null, price ? 'the fuel price' : null];
    return `For fuel, enter ${joinList(missing.filter((item): item is string => item !== null), 'en')}.`;
  },
  fuelDetail: ({ km, roundTrip, extraKm, consumption, price, estimated }) =>
    `${km}${roundTrip ? ' (there and back)' : ''}${extraKm ? `, plus ${extraKm} km at the destination` : ''} × ${consumption} l/100 km × ${price} per litre.` +
    (estimated ? ' The distance is a map estimate: enter the exact one from a route planner.' : ''),
  tollsMissing:
    'Enter the tolls for the whole trip. Serbia, Croatia, North Macedonia, Greece and Italy charge tolls by motorway section.',
  tollsTotal: 'Total for the whole trip.',
  vignetteSkipped: (country) => `${country}: no vignette (your choice)`,
  vignetteNoRate: (country) => `No exchange rate to convert the vignette price (${country}); add it under tolls.`,
  vignettePart: (country, products, amount) => `${country}, ${products}: ${amount}`,
  vignetteConverted: 'Prices in another currency are converted at the reference rate.',
  vignetteEmission: 'Romania’s vignette depends on the car’s Euro emission standard: choose it for the exact amount.',
  vignettePriceUntil: (date) => `The published price applies until ${date}; later dates fall under a new price list.`,
  pricesStale: 'The prices were checked several months ago: confirm them with the operator.',
  vignetteAssumption:
    'Vignettes are counted for motorway driving on the day you leave and the day you come back. If you also use motorways during the stay, choose a longer vignette.',

  ticketMissing: 'Enter the ticket price per person.',
  ticketDetail: (travelers, price, twice, direction) =>
    `${travelers} × ${price}${twice ? ' × 2' : ''} (${direction === 'return' ? 'return ticket' : direction === 'both' ? 'both ways' : 'one way'})`,
  airSerbiaNoRate: 'No exchange rate to convert the Air Serbia price.',
  oneCarrier: 'Air Serbia accepts one carrier per passenger.',
  cabinOnly: (maxKg) =>
    `Air Serbia carries dogs in the cabin only, up to ${maxKg} kg together with the carrier; no option for the hold is published.`,
  airSerbiaDetail: (fee, regional, dogs, flights) =>
    `Air Serbia: ${fee} per flight${regional ? ' (regional)' : ' (Europe)'} × ${dogs} × ${flights} ${flights === 1 ? 'flight' : 'flights'}.`,
  petFeeMissing: 'Enter the carrier’s fee for the dog (0 if there is none).',
  petFeePerDirection: (dogs, fee, legs) => `${dogs} × ${fee} × ${legs} ${legs === 1 ? 'direction' : 'directions'}`,
  petFeePerDog: (dogs, fee) => `${dogs} × ${fee} per dog for the whole trip`,
  petFeeTotal: (fee) => `Total: ${fee}`,

  accommodationMissing: 'Enter the accommodation price per night.',
  accommodationDetail: (nights, perNight) => `${nights} × ${perNight} per night`,
  stayFeeMissing: 'Ask the accommodation about a pet fee and enter it (0 if there is none).',
  stayFeePerNight: (dogs, nights, fee) => `${dogs} × ${nights} × ${fee} per dog per night`,
  stayFeePerStay: (dogs, fee) => `${dogs} × ${fee} per dog for the whole stay`,
  stayFeeOnce: (fee) => `${fee} for the whole stay`,

  foodMissing: 'Not entered: a daily food budget.',
  foodPeople: (travelers, days, amount) => `${travelers} × ${days} ${days === 1 ? 'day' : 'days'} × ${amount}`,
  foodDog: (dogs, days, amount) => `dog food ${dogs} × ${days} ${days === 1 ? 'day' : 'days'} × ${amount}`,
  foodWithoutPeople: ' (without food for the travellers)',
  foodWithoutDog: ' (without dog food)',

  prepNone: 'The readiness check asks for no extra preparation at the vet.',
  prepAskVet: (items) => `Ask your vet for the price: ${items}.`,
  prepMissing: (items) => ` Price missing: ${items}.`,
  optionalMissing: 'Not entered.',
  optionalTotal: 'Total amount.',

  compare: {
    missing: (scenario, categories) => `${scenario}: ${categories} missing, so the total is only a lower bound.`,
    sharedMissing: (category) =>
      `${category}: part of the price is missing in the same way in every option, so it does not change the comparison, but the totals are lower bounds.`,
    optionalUneven: (category, scenarios) =>
      `${category}: the amount was entered only for ${joinList(scenarios, 'en')}. Enter it for every option or for none.`,
    differentLengths: (nights) => `The options last different lengths of time (${nights.join(', ')} nights): compare the price per day too.`,
    estimates: 'Some amounts are estimates, so the totals are ranges.',
  },
};

export const COST_MESSAGES: Readonly<Record<Lang, CostMessages>> = { sr: SR, en: EN };
