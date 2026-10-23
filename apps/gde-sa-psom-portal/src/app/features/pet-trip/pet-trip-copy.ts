import { computed, type Signal } from '@angular/core';
import { injectActiveLang, pluralForm } from '@gde/shared/util';
import type { ComparisonVerdict } from './domain/compare';
import { country, type CountryCode } from './domain/countries';
import type { CostBasis, PetTransportFeeUnit, StayPetFeeUnit } from './domain/costs';
import { joinList, type Lang, LOCALE, tripLang } from './domain/lang';
import type { Currency } from './domain/money';
import type { ItemStatus, OverallReadiness } from './domain/readiness';
import type { MicrochipStatus, MovementPurpose, TransportMode, YesNoUnknown } from './domain/trip.models';
import type { EmissionClass } from './domain/vignettes';
import type { InsightsStatus } from './ai/insights.models';
import { ROAD_FACTOR } from './domain/distance';

const factor = (value: number, lang: Lang): string =>
  new Intl.NumberFormat(LOCALE[lang], { maximumFractionDigits: 1 }).format(value);

const DOG_NOUN_SR = { one: 'pas', few: 'psa', many: 'pasa' } as const;

/**
 * The visible copy of /putovanje-sa-psom, in Serbian (Latin script) and
 * English; the page follows the site's language switch.
 *
 * It lives here rather than in rs.json / en.json for the same reason as the
 * hub pages' copy: it is long and only this lazy page needs it. Rule texts
 * live with the rules (domain/rules/ruleset.ts), and the sentences of the
 * report and the costs with the domain (domain/*.messages.ts).
 */
const SR = {
  breadcrumb: 'Putovanje sa psom',
  h1: 'Putovanje sa psom u inostranstvo',
  lead:
    'Proveri šta psu treba za put iz Srbije i koliko će te put koštati, na jednom mestu. Uslove uzimamo iz zvaničnih izvora i uz svaki pokazujemo izvor i datum provere.',
  points: [
    { title: 'Spremnost', text: 'Šta je potvrđeno, šta moraš da uradiš i do kog datuma.' },
    { title: 'Troškovi', text: 'Gorivo, vinjete, karte, smeštaj i doplate za psa, uz oznaku šta je uneto, šta zvanična cena, a šta procena.' },
    { title: 'Poređenje', text: 'Do tri varijante puta, uz upozorenje kad nisu uporedive.' },
  ],
  coverageTitle: 'Šta pokrivamo',
  coverage:
    'Polazak iz Srbije i nekomercijalno putovanje: pas putuje sa tobom ili sa osobom koju ovlastiš. EU uslovi su provereni za Hrvatsku, Mađarsku, Rumuniju, Bugarsku, Grčku, Sloveniju, Austriju, Nemačku i Italiju. Za Crnu Goru, Bosnu i Hercegovinu i Severnu Makedoniju dobijaš delimičan izveštaj iz starijih zvaničnih izvora.',
  disclaimer:
    'Ovo nije pravni ni veterinarski savet. Konačnu reč imaju veterinarski inspektor, granične službe i prevoznik.',
  rulesCheckedAt: (date: string) => `Pravila su poslednji put proverena ${date}`,
  storageNote: 'Podaci koje uneseš ostaju u tvom pregledaču; ne šaljemo ih nigde dok sam ne pokreneš AI objašnjenje.',
  optional: 'neobavezno',
  sourceChecked: (date: string) => `provereno ${date}`,

  stepsAria: 'Koraci',
  steps: { trip: 'Put', dogs: 'Pas', results: 'Rezultat' },
  next: 'Dalje',
  back: 'Nazad',
  check: 'Proveri putovanje',
  edit: 'Izmeni podatke',
  reset: 'Počni ispočetka',
  resetConfirm: 'Obrisati sve unete podatke?',
  fixErrors: 'Proveri označena polja.',

  trip: {
    legend: 'Kuda i kako putuješ',
    departureCity: 'Polazište (grad)',
    departureCityHint: 'Samo za procenu udaljenosti.',
    departureCityPlaceholder: 'npr. Beograd',
    destination: 'Zemlja odredišta',
    destinationsEu: 'Evropska unija',
    destinationsOther: 'Van EU (delimičan izveštaj)',
    destinationCity: 'Mesto odredišta',
    destinationCityPlaceholder: 'npr. Split',
    transport: 'Prevoz',
    transit: 'Zemlje kroz koje prolaziš, redom',
    transitHint: 'Od njih zavisi gde ulaziš u EU i koje vinjete trebaju.',
    transitSuggest: 'Česte rute',
    transitAdd: 'Dodaj zemlju',
    transitNone: 'Direktno, bez tranzita',
    transitRemove: (name: string) => `Ukloni ${name}`,
    departureDate: 'Datum polaska',
    returnDate: 'Datum povratka',
    oneWay: 'Putujem samo u jednom pravcu',
    travelers: 'Broj putnika',
    purpose: 'Svrha puta psa',
    purposes: {
      'non-commercial': 'Pas putuje sa mnom (ili sa osobom koju ovlastim)',
      commercial: 'Prodaja, udomljavanje ili pas putuje sam',
    } satisfies Record<MovementPurpose, string>,
    errors: {
      departureDate: 'Unesi datum polaska.',
      pastDeparture: 'Datum polaska je u prošlosti.',
      returnBeforeDeparture: 'Povratak mora biti posle polaska.',
      travelers: 'Unesi od 1 do 9 putnika.',
    },
  },

  dogs: {
    legend: 'O psu',
    dogTitle: (index: number) => `Pas ${index + 1}`,
    add: 'Dodaj još jednog psa',
    remove: 'Ukloni ovog psa',
    maxNote: 'Najviše 5 ljubimaca: sa više njih ne važe pravila za nekomercijalno putovanje.',
    birthDate: 'Datum rođenja (približno je u redu)',
    birthDateHint: 'Važno za štence: vakcina se daje najranije sa 12 nedelja.',
    microchip: 'Mikročip',
    microchipOptions: {
      iso: 'Ima čip od 15 cifara (ISO)',
      'unknown-type': 'Ima čip, ne znam koji',
      other: 'Ima čip koji nije ISO',
      none: 'Nema čip',
    } satisfies Record<MicrochipStatus, string>,
    rabiesVaccinated: 'Vakcinisan protiv besnila',
    rabiesVaccinationDate: 'Datum poslednje vakcinacije',
    rabiesValidUntil: 'Vakcina važi do',
    rabiesValidUntilHint: 'Piše u pasošu, uz nalepnicu vakcine.',
    rabiesPrimary: 'Da li je to bila prva vakcinacija, ili data posle isteka prethodne?',
    chipBeforeVaccination: 'Da li je čip ugrađen pre vakcine (ili istog dana)?',
    passport: 'Ima pasoš za kućne ljubimce',
    restrictedBreed: 'Da li je pas pit bul terijer, američki stafordširski terijer, stafordširski bul terijer, bul terijer ili mešanac tih rasa?',
    restrictedBreedHint: 'Pitamo samo zato što Nemačka i Hrvatska ograničavaju ove rase.',
    fciRegistered: 'Da li je pas upisan u registar FCI (ima rodovnik)?',
    weightKg: 'Težina psa (kg)',
    weightHint: 'Avio-prevoznici ograničavaju težinu psa sa transporterom.',
    errors: {
      validUntil: 'Datum važenja mora biti posle datuma vakcinacije.',
      futureBirth: 'Datum rođenja ne može biti u budućnosti.',
      weight: 'Unesi težinu između 0,5 i 100 kg.',
    },
  },

  yesNo: { yes: 'Da', no: 'Ne', unknown: 'Ne znam' } satisfies Record<YesNoUnknown, string>,

  transport: {
    car: 'Automobilom',
    plane: 'Avionom',
    bus: 'Autobusom',
    train: 'Vozom',
    other: 'Drugo',
  } satisfies Record<TransportMode, string>,

  tabs: { readiness: 'Spremnost', costs: 'Troškovi', summary: 'Pregled' },
  resultsAria: 'Rezultati provere',

  readiness: {
    heading: 'Spremnost za put',
    subheading: 'Šta traže pravila, po proverenim zvaničnim izvorima.',
    earliestDeparture: (date: string) => `Najraniji mogući polazak: ${date}`,
    timeline: 'Rokovi',
    timelineFrom: 'Od',
    timelineUntil: 'Najkasnije',
    timelineEmpty: 'Nema rokova koje možemo da izračunamo: unesi datume.',
    rule: 'Šta kaže pravilo',
    howTo: 'Kako',
    caveat: 'Napomena',
    dated: 'Stariji izvor',
    sources: 'Izvori',
    verified: (date: string) => `Pravilo provereno: ${date}`,
    unverified: 'Pravilo nije provereno',
    stale: 'Provera je zastarela',
    conditional: 'Ako ovo pravilo i dalje važi',
    assumptions: 'Pretpostavke',
    rulesetVersion: (version: string) => `Verzija pravila: ${version}`,
  },

  status: {
    'action-required': 'Potrebna akcija',
    'insufficient-info': 'Nedostaju podaci',
    'needs-verification': 'Potrebna provera',
    confirmed: 'Potvrđeno',
  } satisfies Record<ItemStatus, string>,

  overall: {
    ready: {
      title: 'Svi provereni uslovi su ispunjeni',
      text: 'Po pravilima koja smo proverili, pas je spreman za ovaj put. Uslove prevoznika i granice ipak potvrdi pre polaska.',
    },
    blocked: {
      title: 'Ovako put nije moguć',
      text: 'Bar jedan uslov ne može da se ispuni do izabranog datuma, ili ruta nije dozvoljena za ovog psa. Pogledaj stavke pod „Potrebna akcija“.',
    },
    'action-required': {
      title: 'Pre puta treba još nešto da uradiš',
      text: 'Stavke ispod imaju rokove. Kad ih završiš, put je u skladu sa proverenim pravilima.',
    },
    incomplete: {
      title: 'Nedostaju podaci za potpunu proveru',
      text: 'Dopuni podatke označene ispod, pa ćemo izračunati rokove.',
    },
    verify: {
      title: 'Poznati uslovi su ispunjeni, ostalo proveri',
      text: 'O nekim stavkama odlučuju prevoznik, veterinar ili nadležni organ, ili ih znamo samo iz starijih izvora.',
    },
    unsupported: {
      title: 'Delimičan izveštaj',
      text: 'Za ovu rutu nemamo proverena pravila. Prikazujemo ono što znamo, bez zaključka da li put sme.',
    },
  } satisfies Record<OverallReadiness, { title: string; text: string }>,

  coverageLevel: {
    full: 'Pravila za ovu destinaciju su proverena.',
    partial: 'Delimična pokrivenost',
    none: 'Nema proverenih pravila',
  },

  costs: {
    heading: 'Troškovi puta',
    subheading: 'Iznosi su iz tvog unosa i zvaničnih cenovnika; nijedan nije ponuda prevoznika ni smeštaja.',
    shared: 'Zajedničko za sve varijante',
    currency: 'Valuta',
    currencyNames: { EUR: 'Evro (€)', RSD: 'Dinar (RSD)' } satisfies Record<Currency, string>,
    currencyHint: 'Već uneti iznosi se preračunavaju po kursu ispod.',
    rate: 'Kurs: dinara za 1 €',
    rateSource: (date: string) => `Srednji kurs NBS na dan ${date}; možeš ga promeniti.`,
    contingency: 'Rezerva (%)',
    contingencyHint: 'Dodaje se na poznate troškove, za nepredviđeno.',
    car: 'Automobil',
    consumption: 'Potrošnja (l/100 km)',
    consumptionPlaceholder: 'npr. 6,5',
    fuelPrice: 'Cena goriva po litri',
    emission: 'Euro norma automobila',
    emissionHint: 'Rumunska vinjeta zavisi od nje.',
    emissionOptions: {
      euro6: 'Euro 6',
      'euro4-5': 'Euro 4 ili 5',
      'euro0-3': 'Euro 3 ili starija',
      electric: 'Električni',
    } satisfies Record<EmissionClass, string>,
    emissionUnknown: 'Ne znam',
    vetPrep: 'Veterinar i dokumenta (ukupno za sve pse)',
    vetPrepHint: 'Prikazujemo samo ono što provera spremnosti traži.',
    vetPrepEstimate: (amount: string) => `Ako ne uneseš, računamo procenu ${amount} (republičke takse).`,
    addScenario: 'Dodaj varijantu za poređenje',
    removeScenario: 'Ukloni varijantu',
    scenarioLabel: 'Naziv varijante',
    scenarioA: 'Tvoj plan',
    scenarioDefault: (id: string) => `Varijanta ${id}`,
    scenarioAHint: 'Odredište, prevoz i datumi dolaze iz koraka „Put“.',
    destination: 'Odredište',
    nights: 'Broj noćenja',
    transit: 'Tranzit (redom)',
    distance: 'Udaljenost u jednom pravcu (km)',
    distanceHint: 'Najtačnije iz planera rute.',
    estimateDistance: 'Proceni sa mape',
    estimating: 'Računam…',
    estimateResult: (min: string, max: string) =>
      `Gruba procena: ${min}–${max} km (vazdušna linija × ${factor(ROAD_FACTOR.min, 'sr')}–${factor(ROAD_FACTOR.max, 'sr')}).`,
    estimateNeedsCities: 'Za procenu unesi polazište i mesto odredišta u koraku „Put“.',
    estimateFailed: 'Procena trenutno nije dostupna: unesi kilometražu ručno.',
    clearEstimate: 'Ukloni procenu',
    extraKm: 'Vožnja na odredištu (km)',
    tolls: 'Putarine ukupno',
    tollsHint: 'Zvanični cenovnici i kalkulatori:',
    vignettes: 'Vinjete',
    vignetteAuto: 'Najjeftinija za dan polaska i povratka',
    vignetteNone: 'Bez vinjete',
    ticket: 'Cena karte po osobi',
    ticketIsReturn: 'Cena je za povratnu kartu',
    petCarrier: 'Doplata za psa',
    petCarrierOptions: { 'air-serbia': 'Air Serbia (zvanična cena)', custom: 'Drugi prevoznik (unosim)' },
    flightsPerDirection: 'Broj letova u jednom pravcu',
    petFee: 'Doplata prevoznika za psa',
    petFeeUnit: 'Doplata se plaća',
    petFeeUnits: {
      'per-dog-per-direction': 'po psu, u svakom pravcu',
      'per-dog': 'po psu, za ceo put',
      total: 'ukupno',
    } satisfies Record<PetTransportFeeUnit, string>,
    accommodation: 'Smeštaj po noći (za sve)',
    stayPetFee: 'Doplata za psa u smeštaju',
    stayPetFeeUnit: 'Doplata se plaća',
    stayPetFeeUnits: {
      'per-dog-per-night': 'po psu i noći',
      'per-dog-per-stay': 'po psu, za ceo boravak',
      'per-stay': 'jednom, za ceo boravak',
    } satisfies Record<StayPetFeeUnit, string>,
    foodAndOther: 'Hrana, aktivnosti i ostalo',
    foodPerson: 'Hrana po osobi dnevno',
    foodDog: 'Hrana za psa dnevno (po psu)',
    activities: 'Aktivnosti ukupno',
    other: 'Ostalo ukupno',
    breakdown: 'Obračun',
    subtotal: 'Poznati troškovi',
    contingencyLine: (percent: number) => `Rezerva ${percent}%`,
    total: 'Ukupno',
    totalLowerBound: 'najmanje',
    perPerson: 'Po osobi',
    perDay: 'Po danu',
    days: (days: number) => `${days} ${pluralForm(days, 'rs') === 'one' ? 'dan' : 'dana'}`,
    missing: 'Nedostaje za potpun obračun',
    complete: 'Svi potrebni troškovi su uneti.',
    assumptions: 'Pretpostavke',
    warnings: 'Upozorenja',
    sources: 'Izvori cena',
  },

  basis: {
    user: 'Uneto',
    verified: 'Zvanična cena',
    estimate: 'Procena',
    unknown: 'Nedostaje',
    'not-included': 'Nije uneto',
  } satisfies Record<CostBasis, string>,
  basisPartial: 'Delimično poznato',

  compare: {
    heading: 'Poređenje varijanti',
    readiness: 'Spremnost',
    total: 'Ukupno',
    perPerson: 'Po osobi',
    perDay: 'Po danu',
    nights: 'Noćenja',
    transport: 'Prevoz',
    destination: 'Odredište',
    complete: 'Obračun',
    completeYes: 'potpun',
    completeNo: 'nepotpun',
    cheapest: 'Najjeftinije',
    verdict: {
      single: 'Dodaj još jednu varijantu da bismo ih uporedili.',
      cheapest: (label: string, saving: string) => `${label} je najjeftinija varijanta, za ${saving} od sledeće.`,
      'too-close': 'Procene se preklapaju, pa ne možemo da kažemo koja je varijanta jeftinija.',
      'not-comparable': 'Varijante još nisu uporedive:',
    } as Record<ComparisonVerdict, string | ((label: string, saving: string) => string)>,
    readinessNote: 'Cena ne govori ništa o tome da li put sme: spremnost je posebna provera.',
  },

  summary: {
    heading: 'Pregled putovanja',
    trip: 'Put',
    readiness: 'Spremnost (pravila)',
    costs: 'Troškovi (procena)',
    nextSteps: 'Sledeći koraci',
    noSteps: 'Nema rokova za sada.',
    separation: 'Troškovi i spremnost su odvojeni: izračunat trošak ne znači da je put dozvoljen.',
    print: 'Odštampaj',
    travelers: (count: number) => `${count} ${count === 1 ? 'putnik' : 'putnika'}`,
    dogs: (count: number) => `${count} ${DOG_NOUN_SR[pluralForm(count, 'rs')]}`,
  },

  ai: {
    heading: 'Objašnjenje uz AI',
    intro: 'AI (Claude, Anthropic) može jednostavnije da objasni ovaj izveštaj i predloži uštede. Pravila i iznosi iznad ostaju jedini merodavni.',
    privacy:
      'Šaljemo samo statuse, rokove i iznose iz izveštaja, bez gradova, datuma rođenja i drugih ličnih podataka. Zbog ograničenog broja objašnjenja po uređaju pregledač čuva nasumičan identifikator.',
    remaining: (left: number, limit: number) => `Preostalo AI objašnjenja na ovom uređaju: ${left} od ${limit}.`,
    quota: {
      device: (limit: number | null) =>
        `Iskoristio si dozvoljen broj AI objašnjenja na ovom uređaju${limit ? ` (${limit})` : ''}. Sve iznad radi i bez njih.`,
      network: 'Sa ove mreže je danas poslato previše zahteva za AI objašnjenje. Pokušaj sutra; sve iznad radi i bez njega.',
      global: 'Dnevni broj AI objašnjenja na sajtu je potrošen. Pokušaj sutra; sve iznad radi i bez njega.',
    },
    button: 'Objasni uz AI',
    again: 'Objasni ponovo',
    loading: 'Pišem objašnjenje…',
    label: 'Napisao AI na osnovu podataka iznad',
    steps: 'Redosled koraka',
    savings: 'Gde možeš da uštediš',
    comparison: 'Razlika između varijanti',
    stale: 'Podaci su se promenili posle objašnjenja.',
    status: {
      ok: '',
      cached: '',
      disabled: 'AI objašnjenje trenutno nije dostupno. Sve iznad je izračunato bez AI.',
      quota: 'Dnevni broj AI objašnjenja je potrošen. Pokušaj sutra; sve iznad radi i bez njega.',
      busy: 'Servis je trenutno zauzet. Pokušaj za koji minut.',
      unavailable: 'AI objašnjenje trenutno nije dostupno. Sve iznad je izračunato bez AI.',
      invalid: 'Odgovor nije prošao našu proveru, pa ga ne prikazujemo. Sve iznad važi.',
    } satisfies Record<InsightsStatus, string>,
  },
};

export type PetTripCopy = typeof SR;

const EN: PetTripCopy = {
  breadcrumb: 'Travel with a dog',
  h1: 'Travelling abroad with a dog',
  lead:
    'Check what your dog needs for a trip from Serbia and what the trip will cost, in one place. We take the requirements from official sources and show the source and the date we checked it next to each one.',
  points: [
    { title: 'Readiness', text: 'What is confirmed, what you still have to do, and by when.' },
    { title: 'Costs', text: 'Fuel, vignettes, tickets, accommodation and pet fees, each marked as entered by you, an official price or an estimate.' },
    { title: 'Comparison', text: 'Up to three versions of the trip, with a warning when they cannot be compared.' },
  ],
  coverageTitle: 'What we cover',
  coverage:
    'Departures from Serbia and non-commercial travel: the dog travels with you or with a person you authorise. The EU conditions are checked for Croatia, Hungary, Romania, Bulgaria, Greece, Slovenia, Austria, Germany and Italy. For Montenegro, Bosnia and Herzegovina and North Macedonia you get a partial report based on older official sources.',
  disclaimer:
    'This is not legal or veterinary advice. The veterinary inspector, the border authorities and the carrier have the final say.',
  rulesCheckedAt: (date: string) => `The rules were last checked on ${date}.`,
  storageNote: 'What you enter stays in your browser; we send it nowhere unless you start the AI explanation yourself.',
  optional: 'optional',
  sourceChecked: (date: string) => `checked ${date}`,

  stepsAria: 'Steps',
  steps: { trip: 'Trip', dogs: 'Dog', results: 'Results' },
  next: 'Next',
  back: 'Back',
  check: 'Check the trip',
  edit: 'Edit details',
  reset: 'Start over',
  resetConfirm: 'Delete everything you entered?',
  fixErrors: 'Check the marked fields.',

  trip: {
    legend: 'Where and how you travel',
    departureCity: 'Starting point (town)',
    departureCityHint: 'Only used to estimate the distance.',
    departureCityPlaceholder: 'e.g. Belgrade',
    destination: 'Destination country',
    destinationsEu: 'European Union',
    destinationsOther: 'Outside the EU (partial report)',
    destinationCity: 'Destination town',
    destinationCityPlaceholder: 'e.g. Split',
    transport: 'Transport',
    transit: 'Countries you pass through, in order',
    transitHint: 'They decide where you enter the EU and which vignettes you need.',
    transitSuggest: 'Common routes',
    transitAdd: 'Add a country',
    transitNone: 'Direct, no transit',
    transitRemove: (name: string) => `Remove ${name}`,
    departureDate: 'Departure date',
    returnDate: 'Return date',
    oneWay: 'I am travelling one way only',
    travelers: 'Number of travellers',
    purpose: 'Purpose of the dog’s trip',
    purposes: {
      'non-commercial': 'The dog travels with me (or with a person I authorise)',
      commercial: 'Sale, rehoming, or the dog travels alone',
    },
    errors: {
      departureDate: 'Enter the departure date.',
      pastDeparture: 'The departure date is in the past.',
      returnBeforeDeparture: 'The return must be after the departure.',
      travelers: 'Enter between 1 and 9 travellers.',
    },
  },

  dogs: {
    legend: 'About the dog',
    dogTitle: (index: number) => `Dog ${index + 1}`,
    add: 'Add another dog',
    remove: 'Remove this dog',
    maxNote: 'No more than 5 pets: with more, the rules for non-commercial travel do not apply.',
    birthDate: 'Date of birth (approximate is fine)',
    birthDateHint: 'Matters for puppies: the vaccination is given at 12 weeks at the earliest.',
    microchip: 'Microchip',
    microchipOptions: {
      iso: 'Has a 15-digit chip (ISO)',
      'unknown-type': 'Has a chip, not sure which',
      other: 'Has a non-ISO chip',
      none: 'No chip',
    },
    rabiesVaccinated: 'Vaccinated against rabies',
    rabiesVaccinationDate: 'Date of the last vaccination',
    rabiesValidUntil: 'Vaccination valid until',
    rabiesValidUntilHint: 'It is in the passport, next to the vaccine sticker.',
    rabiesPrimary: 'Was that the first vaccination, or one given after the previous one expired?',
    chipBeforeVaccination: 'Was the chip implanted before the vaccination (or on the same day)?',
    passport: 'Has a pet passport',
    restrictedBreed: 'Is the dog a pit bull terrier, American Staffordshire terrier, Staffordshire bull terrier, bull terrier or a cross of these breeds?',
    restrictedBreedHint: 'We ask only because Germany and Croatia restrict these breeds.',
    fciRegistered: 'Is the dog registered with the FCI (does it have a pedigree)?',
    weightKg: 'Dog’s weight (kg)',
    weightHint: 'Airlines limit the weight of the dog together with its carrier.',
    errors: {
      validUntil: 'The valid-until date must be after the vaccination date.',
      futureBirth: 'The date of birth cannot be in the future.',
      weight: 'Enter a weight between 0.5 and 100 kg.',
    },
  },

  yesNo: { yes: 'Yes', no: 'No', unknown: 'Not sure' },

  transport: {
    car: 'By car',
    plane: 'By plane',
    bus: 'By coach',
    train: 'By train',
    other: 'Other',
  },

  tabs: { readiness: 'Readiness', costs: 'Costs', summary: 'Overview' },
  resultsAria: 'Check results',

  readiness: {
    heading: 'Ready to travel',
    subheading: 'What the rules require, according to the official sources we checked.',
    earliestDeparture: (date: string) => `Earliest possible departure: ${date}`,
    timeline: 'Deadlines',
    timelineFrom: 'From',
    timelineUntil: 'By',
    timelineEmpty: 'No deadlines we can work out yet: enter the dates.',
    rule: 'What the rule says',
    howTo: 'How',
    caveat: 'Note',
    dated: 'Older source',
    sources: 'Sources',
    verified: (date: string) => `Rule checked: ${date}`,
    unverified: 'Rule not checked',
    stale: 'The check is out of date',
    conditional: 'If this rule still applies',
    assumptions: 'Assumptions',
    rulesetVersion: (version: string) => `Ruleset version: ${version}`,
  },

  status: {
    'action-required': 'Action needed',
    'insufficient-info': 'Information missing',
    'needs-verification': 'Needs checking',
    confirmed: 'Confirmed',
  },

  overall: {
    ready: {
      title: 'All checked requirements are met',
      text: 'Under the rules we checked, the dog is ready for this trip. Still confirm the carrier’s and the border’s conditions before you leave.',
    },
    blocked: {
      title: 'This trip is not possible as planned',
      text: 'At least one requirement cannot be met by the chosen date, or the route is not allowed for this dog. See the items under “Action needed”.',
    },
    'action-required': {
      title: 'There is still something to do before the trip',
      text: 'The items below have deadlines. Once you have done them, the trip meets the rules we checked.',
    },
    incomplete: {
      title: 'Information missing for a full check',
      text: 'Fill in the details marked below and we will work out the deadlines.',
    },
    verify: {
      title: 'Known requirements are met; check the rest',
      text: 'Some items are decided by the carrier, a vet or an authority, or we know them only from older sources.',
    },
    unsupported: {
      title: 'Partial report',
      text: 'We have no checked rules for this route. We show what we know, without concluding whether the trip is allowed.',
    },
  },

  coverageLevel: {
    full: 'The rules for this destination are checked.',
    partial: 'Partial coverage',
    none: 'No checked rules',
  },

  costs: {
    heading: 'Trip costs',
    subheading: 'Amounts come from what you enter and from official price lists; none of them is a quote from a carrier or an accommodation.',
    shared: 'Shared by all options',
    currency: 'Currency',
    currencyNames: { EUR: 'Euro (€)', RSD: 'Serbian dinar (RSD)' },
    currencyHint: 'Amounts already entered are converted at the rate below.',
    rate: 'Rate: dinars for €1',
    rateSource: (date: string) => `National Bank of Serbia middle rate on ${date}; you can change it.`,
    contingency: 'Contingency (%)',
    contingencyHint: 'Added to the known costs, for the unexpected.',
    car: 'Car',
    consumption: 'Fuel consumption (l/100 km)',
    consumptionPlaceholder: 'e.g. 6.5',
    fuelPrice: 'Fuel price per litre',
    emission: 'Car’s Euro emission standard',
    emissionHint: 'Romania’s vignette depends on it.',
    emissionOptions: {
      euro6: 'Euro 6',
      'euro4-5': 'Euro 4 or 5',
      'euro0-3': 'Euro 3 or older',
      electric: 'Electric',
    },
    emissionUnknown: 'Not sure',
    vetPrep: 'Vet and documents (total for all dogs)',
    vetPrepHint: 'We show only what the readiness check asks for.',
    vetPrepEstimate: (amount: string) => `If you leave it empty, we use an estimate of ${amount} (state fees).`,
    addScenario: 'Add an option to compare',
    removeScenario: 'Remove this option',
    scenarioLabel: 'Option name',
    scenarioA: 'Your plan',
    scenarioDefault: (id: string) => `Option ${id}`,
    scenarioAHint: 'Destination, transport and dates come from the “Trip” step.',
    destination: 'Destination',
    nights: 'Number of nights',
    transit: 'Transit (in order)',
    distance: 'One-way distance (km)',
    distanceHint: 'Most accurate from a route planner.',
    estimateDistance: 'Estimate from the map',
    estimating: 'Working it out…',
    estimateResult: (min: string, max: string) =>
      `Rough estimate: ${min}–${max} km (straight line × ${factor(ROAD_FACTOR.min, 'en')}–${factor(ROAD_FACTOR.max, 'en')}).`,
    estimateNeedsCities: 'For an estimate, enter the starting point and the destination town in the “Trip” step.',
    estimateFailed: 'The estimate is not available right now: enter the distance yourself.',
    clearEstimate: 'Remove estimate',
    extraKm: 'Driving at the destination (km)',
    tolls: 'Tolls in total',
    tollsHint: 'Official price lists and calculators:',
    vignettes: 'Vignettes',
    vignetteAuto: 'Cheapest for the days you leave and come back',
    vignetteNone: 'No vignette',
    ticket: 'Ticket price per person',
    ticketIsReturn: 'The price is for a return ticket',
    petCarrier: 'Fee for the dog',
    petCarrierOptions: { 'air-serbia': 'Air Serbia (official price)', custom: 'Another carrier (I enter it)' },
    flightsPerDirection: 'Flights in each direction',
    petFee: 'Carrier’s fee for the dog',
    petFeeUnit: 'The fee is charged',
    petFeeUnits: {
      'per-dog-per-direction': 'per dog, each way',
      'per-dog': 'per dog, for the whole trip',
      total: 'in total',
    },
    accommodation: 'Accommodation per night (for everyone)',
    stayPetFee: 'Pet fee at the accommodation',
    stayPetFeeUnit: 'The fee is charged',
    stayPetFeeUnits: {
      'per-dog-per-night': 'per dog per night',
      'per-dog-per-stay': 'per dog, for the whole stay',
      'per-stay': 'once, for the whole stay',
    },
    foodAndOther: 'Food, activities and other',
    foodPerson: 'Food per person per day',
    foodDog: 'Dog food per day (per dog)',
    activities: 'Activities in total',
    other: 'Other in total',
    breakdown: 'Breakdown',
    subtotal: 'Known costs',
    contingencyLine: (percent: number) => `Contingency ${percent}%`,
    total: 'Total',
    totalLowerBound: 'at least',
    perPerson: 'Per person',
    perDay: 'Per day',
    days: (days: number) => `${days} ${days === 1 ? 'day' : 'days'}`,
    missing: 'Missing for a complete estimate',
    complete: 'All the costs needed are entered.',
    assumptions: 'Assumptions',
    warnings: 'Warnings',
    sources: 'Price sources',
  },

  basis: {
    user: 'Entered',
    verified: 'Official price',
    estimate: 'Estimate',
    unknown: 'Missing',
    'not-included': 'Not entered',
  },
  basisPartial: 'Partly known',

  compare: {
    heading: 'Comparing the options',
    readiness: 'Readiness',
    total: 'Total',
    perPerson: 'Per person',
    perDay: 'Per day',
    nights: 'Nights',
    transport: 'Transport',
    destination: 'Destination',
    complete: 'Estimate',
    completeYes: 'complete',
    completeNo: 'incomplete',
    cheapest: 'Cheapest',
    verdict: {
      single: 'Add another option so we can compare them.',
      cheapest: (label: string, saving: string) => `${label} is the cheapest option, by ${saving} over the next one.`,
      'too-close': 'The estimates overlap, so we cannot say which option is cheaper.',
      'not-comparable': 'The options cannot be compared yet:',
    },
    readinessNote: 'The price says nothing about whether the trip is allowed: readiness is a separate check.',
  },

  summary: {
    heading: 'Trip overview',
    trip: 'Trip',
    readiness: 'Readiness (rules)',
    costs: 'Costs (estimate)',
    nextSteps: 'Next steps',
    noSteps: 'No deadlines for now.',
    separation: 'Costs and readiness are kept apart: a calculated cost does not mean the trip is allowed.',
    print: 'Print',
    travelers: (count: number) => `${count} ${count === 1 ? 'traveller' : 'travellers'}`,
    dogs: (count: number) => `${count} ${count === 1 ? 'dog' : 'dogs'}`,
  },

  ai: {
    heading: 'AI explanation',
    intro: 'AI (Claude, by Anthropic) can explain this report more simply and suggest savings. The rules and amounts above remain the only authoritative ones.',
    privacy:
      'We send only the statuses, deadlines and amounts from the report, without towns, dates of birth or other personal data. Because the number of explanations per device is limited, your browser keeps a random identifier.',
    remaining: (left: number, limit: number) => `AI explanations left on this device: ${left} of ${limit}.`,
    quota: {
      device: (limit: number | null) =>
        `You have used the AI explanations allowed on this device${limit ? ` (${limit})` : ''}. Everything above works without them.`,
      network: 'Too many AI explanation requests came from this network today. Try again tomorrow; everything above works without it.',
      global: 'The site’s daily number of AI explanations has been used up. Try again tomorrow; everything above works without it.',
    },
    button: 'Explain with AI',
    again: 'Explain again',
    loading: 'Writing the explanation…',
    label: 'Written by AI from the data above',
    steps: 'Order of steps',
    savings: 'Where you can save',
    comparison: 'Difference between the options',
    stale: 'The data has changed since the explanation.',
    status: {
      ok: '',
      cached: '',
      disabled: 'The AI explanation is not available right now. Everything above was calculated without AI.',
      quota: 'The daily number of AI explanations has been used up. Try again tomorrow; everything above works without it.',
      busy: 'The service is busy right now. Try again in a minute or two.',
      unavailable: 'The AI explanation is not available right now. Everything above was calculated without AI.',
      invalid: 'The answer did not pass our checks, so we do not show it. Everything above still stands.',
    },
  },
};

export const COPY: Readonly<Record<Lang, PetTripCopy>> = { sr: SR, en: EN };

/** The site's language as the planner's: call in an injection context. */
export function injectTripLang(): Signal<Lang> {
  const active = injectActiveLang();
  return computed(() => tripLang(active()));
}

/** Common driving routes from Serbia, as quick picks for the transit field (geography, not rules). */
export const ROUTE_SUGGESTIONS: Partial<Record<CountryCode, readonly (readonly CountryCode[])[]>> = {
  SI: [['HR'], ['HU']],
  AT: [['HU'], ['HR', 'SI']],
  DE: [['HU', 'AT'], ['HR', 'SI', 'AT']],
  IT: [['HR', 'SI']],
  GR: [['MK'], ['BG']],
};

/** "Preko Hrvatske i Slovenije" / "Via Croatia and Slovenia". */
export function routeLabel(transit: readonly CountryCode[], lang: Lang): string {
  return lang === 'en'
    ? `Via ${joinList(transit.map((code) => country(code).name.en), 'en')}`
    : `Preko ${joinList(transit.map((code) => country(code).genitive), 'sr')}`;
}
