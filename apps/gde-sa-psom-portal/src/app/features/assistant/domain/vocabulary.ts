import type { CountryCode } from '../../pet-trip/domain/countries';
import type { TransportMode } from '../../pet-trip/domain/trip.models';
import type { CategoryId } from './query.models';

/**
 * The words the assistant understands without AI, folded (lower case, no
 * diacritics, `đ` as "dj"): Serbian in Latin script, the usual chat
 * shorthand, and English, since the site has an English version.
 *
 * `prefix` entries match any word that starts with them ("kafic" →
 * kafić, kafića, kafiće, kafićima); `exact` entries match only themselves,
 * for words whose prefix would catch others ("bar" is not "barem"). A prefix
 * with a space ("crnu gor") and a phrase are matched against the whole
 * folded message.
 */
export interface KeywordSet<T> {
  value: T;
  prefix?: readonly string[];
  exact?: readonly string[];
  phrases?: readonly string[];
}

export const CATEGORY_KEYWORDS: readonly KeywordSet<CategoryId[]>[] = [
  {
    value: ['cafe'],
    prefix: ['kafic', 'kafeterij', 'espres', 'kapucin', 'cappucc', 'caffe', 'poslasticar', 'coffee'],
    exact: ['kafa', 'kafu', 'kafe', 'kafi', 'kafom', 'cafe', 'cafes'],
  },
  {
    value: ['cafe', 'restaurant'],
    prefix: ['doruc', 'brunch', 'breakfast'],
  },
  {
    value: ['restaurant'],
    prefix: ['restoran', 'kafan', 'rucak', 'rucku', 'rucka', 'rucam', 'rucal', 'rucat', 'picerij', 'pizz', 'burger', 'rostilj', 'splav', 'bistro', 'restaurant', 'lunch', 'dinner', 'klop'],
    exact: ['vecera', 'veceru', 'vecere', 'veceri', 'vecerati', 'veceramo', 'jelo', 'jesti', 'pojesti', 'jedemo', 'pica', 'picu', 'food', 'eat'],
  },
  {
    value: ['bar'],
    prefix: ['pab', 'pivnic', 'koktel', 'cocktail', 'vinarij', 'drink'],
    exact: ['bar', 'barovi', 'barove', 'barova', 'barovima', 'baru', 'bars', 'pub', 'pubs', 'pivo', 'piva', 'pivce', 'pice', 'vino', 'beer'],
  },
  {
    value: ['stay'],
    prefix: ['smestaj', 'hotel', 'motel', 'apartman', 'prenoc', 'nocenj', 'vikendic', 'pansion', 'hostel', 'konacist', 'spavanj', 'prespav', 'accommodation', 'airbnb', 'kamp'],
    exact: ['vila', 'vile', 'vilu', 'konak', 'konaci', 'soba', 'sobu', 'sobe', 'spavati', 'spavam', 'spavamo', 'stay', 'apartment', 'apartments'],
  },
  {
    value: ['park'],
    prefix: ['parkov', 'setnj', 'proset', 'setal', 'setat', 'setam', 'trcanj', 'ogradjen', 'ograden', 'livad', 'dogpark'],
    exact: ['park', 'parka', 'parku', 'parkom', 'parks', 'priroda', 'prirodu', 'prirodi', 'suma', 'sumu', 'sumi', 'walk', 'walks'],
  },
  {
    value: ['vet'],
    prefix: ['veterin', 'ambulant', 'klinik', 'dezurn', 'povredj', 'povreden', 'bolest', 'vakcin', 'cipovan', 'titr', 'clinic'],
    exact: ['vet', 'veta', 'vetu', 'vets', 'hitno', 'hitna', 'hitnu', 'doktor', 'doktora', 'titar'],
  },
  {
    value: ['petshop'],
    prefix: ['petshop', 'pet-shop', 'granul', 'igrack', 'ogrlic', 'povodac', 'povodc'],
    exact: ['shop', 'shopovi', 'shopove', 'prodavnica', 'prodavnicu', 'prodavnice', 'prodavnici', 'oprema', 'opremu', 'store'],
    phrases: ['pet shop', 'pet shopovi', 'pet shopove', 'pet shopa', 'pet shopu', 'pet store', 'hrana za pse', 'hranu za pse', 'hranu za psa', 'hrana za psa', 'dog food'],
  },
];

/** "Sve", "pet friendly mesta": every venue type rather than one category. */
export const ANY_CATEGORY_KEYWORDS: KeywordSet<true> = {
  value: true,
  prefix: ['objekat', 'objekt'],
  exact: ['sve', 'svega', 'mesta', 'mesto', 'places', 'everything', 'anything'],
  phrases: ['bilo sta', 'bilo gde', 'sta ima', 'sta sve', 'pet friendly'],
};

/** Words for a dog, after "mali", "veliki", "srednji". */
export const DOG_NOUNS: ReadonlySet<string> = new Set([
  'pas', 'psa', 'psu', 'psom', 'pse', 'psi', 'pasa', 'psima', 'kuca', 'kucu', 'kucom', 'kuci', 'ker', 'kera',
  'kucence', 'cuko', 'cuku', 'cuka', 'dog', 'dogs',
]);

export const SMALL_DOG_ADJECTIVE = /^(mal[aeiu]|malo[gjm]|malim|malih|malen\w*|sitn\w*|small|little|tiny|mini)$/;
export const LARGE_DOG_ADJECTIVE = /^(velik\w*|krupn\w*|srednj\w*|big|large|medium)$/;

/** Breeds that settle the size on their own (prefixes). */
export const SMALL_BREEDS: readonly string[] = ['civav', 'cuvav', 'chihuahua', 'maltezer', 'jork', 'yorkie', 'pomeran', 'mops', 'pug', 'jazavicar', 'sicu', 'shih', 'bison', 'patuljast', 'minijatur'];
export const LARGE_BREEDS: readonly string[] = ['labrador', 'retriver', 'retriever', 'ovcar', 'haski', 'husky', 'malamut', 'rotvajler', 'rottweiler', 'doberman', 'bernsk', 'sarplaninac', 'akita', 'samojed', 'korso', 'corso', 'bokser', 'boxer', 'dalmatin', 'seter', 'setter', 'pointer', 'vizsla'];
export const PUPPY_PREFIXES: readonly string[] = ['sten', 'puppy', 'puppies'];

export const GARDEN_KEYWORDS: KeywordSet<true> = {
  value: true,
  prefix: ['bast', 'teras', 'dvorist', 'outdoor', 'garden', 'terrace', 'patio'],
  exact: ['napolju', 'vani', 'spolja', 'otvoreno', 'otvorenom', 'outside'],
};

export const NEAR_ME_PHRASES: readonly string[] = [
  'blizu mene', 'pored mene', 'oko mene', 'kod mene', 'u blizini', 'mojoj blizini', 'u okolini',
  'near me', 'nearby', 'close to me', 'around me', 'gde sam', 'gde se nalazim',
];
export const NEAR_ME_PREFIXES: readonly string[] = ['najbliz', 'closest', 'nearest'];

/** Folded phrases, matched as whole words. */
export const GREETINGS: readonly string[] = ['zdravo', 'cao', 'caos', 'hej', 'hello', 'hi', 'hey', 'pozdrav', 'dobar dan', 'dobro jutro', 'dobro vece', 'good morning', 'good evening'];
export const THANKS: readonly string[] = ['hvala', 'thanks', 'thank you', 'thx', 'super', 'odlicno', 'sjajno', 'bravo', 'top', 'great', 'perfect', 'savrseno'];
export const HELP: readonly string[] = ['pomoc', 'help', 'sta mozes', 'sta znas', 'kako radi', 'kako ovo radi', 'ko si', 'sta si', 'what can you do', 'how does this work'];

/** Countries the trip planner covers, with case forms ("u Hrvatsku", "iz Grčke") and well-known destinations. */
export const COUNTRY_KEYWORDS: readonly KeywordSet<CountryCode>[] = [
  { value: 'HR', prefix: ['hrvatsk', 'croatia', 'dubrovnik', 'makarsk', 'rovinj'], exact: ['zagreb', 'zagreba', 'zagrebu', 'split', 'splitu', 'istra', 'istru', 'istri', 'pula', 'pulu', 'puli', 'zadar', 'zadru'] },
  { value: 'HU', prefix: ['madjarsk', 'madarsk', 'hungar', 'budimpest', 'segedin'], exact: ['budapest'] },
  { value: 'RO', prefix: ['rumunij', 'romani', 'temisvar'] },
  { value: 'BG', prefix: ['bugarsk', 'bulgari', 'sofij', 'suncev breg'], exact: ['sofia'] },
  { value: 'GR', prefix: ['grck', 'greec', 'greek', 'halkidik', 'atin', 'solun', 'sitonij', 'kasandr', 'lefkad', 'thessalon', 'paralij'], exact: ['krf', 'krfu', 'tasos', 'tasosu', 'parga', 'pargu'] },
  { value: 'SI', prefix: ['slovenij', 'slovenia', 'ljubljan', 'portoroz'], exact: ['bled', 'bledu', 'piran', 'piranu'] },
  { value: 'AT', prefix: ['austrij', 'austria', 'salcburg', 'salzburg', 'vienna', 'wien'], exact: ['bec', 'beca', 'becu', 'grac', 'gracu'] },
  { value: 'DE', prefix: ['nemack', 'njemack', 'germany', 'minhen', 'munchen', 'munich', 'berlin', 'frankfurt', 'hamburg', 'stutgart', 'stuttgart', 'keln'] },
  { value: 'IT', prefix: ['italij', 'italy', 'venecij', 'venice', 'firenc', 'toskan', 'tuscan'], exact: ['rim', 'rimu', 'rome', 'trst', 'trstu'] },
  { value: 'ME', prefix: ['crna gor', 'crnu gor', 'crnoj gor', 'crne gor', 'montenegr', 'budv', 'kotor', 'herceg nov', 'tivt', 'ulcinj', 'zabljak'], exact: ['tivat'] },
  { value: 'BA', prefix: ['bosn', 'hercegovin', 'sarajev', 'banjaluk', 'banja luk', 'trebinj', 'mostar', 'jahorin'], exact: ['bih'] },
  { value: 'MK', prefix: ['makedonij', 'macedonia', 'ohrid', 'skopj', 'skoplj'] },
];

export const TRANSPORT_KEYWORDS: readonly KeywordSet<TransportMode>[] = [
  { value: 'car', prefix: ['automobil', 'driving'], exact: ['kolima', 'kola', 'autom', 'auto', 'car', 'kombijem', 'kombi', 'drive'] },
  { value: 'plane', prefix: ['avion', 'letim', 'letimo', 'leteti', 'flight', 'flying', 'aerodrom'], exact: ['let', 'letom', 'fly', 'plane'] },
  { value: 'bus', prefix: ['autobus'], exact: ['busom', 'bus'] },
  { value: 'train', exact: ['voz', 'vozom', 'vozu', 'train'] },
  { value: 'other', prefix: ['trajekt', 'ferry'], exact: ['brodom', 'brod'] },
];

/**
 * Words that make a message about travelling abroad with the dog. Chip,
 * vaccine and titre are not among them: "čipovanje psa u Nišu" is a vet visit.
 */
export const TRIP_KEYWORDS: KeywordSet<true> = {
  value: true,
  prefix: ['inostranstv', 'putovanj', 'putuj', 'putovat', 'granic', 'pasos', 'sertifikat', 'certifikat', 'abroad', 'travel', 'passport', 'border'],
  exact: ['papiri', 'papire', 'dokumenta', 'trip'],
};

/** "Na more" without a country: the planner covers three seaside destinations. */
export const SEASIDE_PHRASES: readonly string[] = ['na more', 'na moru', 'na mora', 'to the sea', 'seaside', 'na primorje', 'na primorju'];
export const SEASIDE_COUNTRIES: readonly CountryCode[] = ['GR', 'HR', 'ME'];

/** "U Srbiji": the whole country, which is no filter at all. */
export const SERBIA_WORDS: ReadonlySet<string> = new Set(['srbija', 'srbiju', 'srbiji', 'srbije', 'serbia']);

/**
 * Words that follow "u", "na" or "kod" without being places ("na kafu",
 * "u centar", "na vikend"), so they are not reported as an unknown place.
 * Keywords above are excluded on their own.
 */
export const NOT_PLACES: ReadonlySet<string> = new Set([
  'kafic', 'kafica', 'rucak', 'pice', 'veceru', 'dorucak', 'setnju', 'setnji', 'izlet', 'izletu', 'odmor', 'odmoru',
  'more', 'moru', 'mora', 'planinu', 'planini', 'planine', 'selo', 'selu', 'grad', 'gradu', 'centar', 'centru',
  'plazu', 'plazi', 'reku', 'reci', 'jezero', 'jezeru', 'trening', 'posao', 'poslu', 'put', 'putu', 'terasi',
  'terasu', 'basti', 'bastu', 'blizini', 'okolini', 'vikend', 'vikendu', 'subotu', 'nedelju', 'petak', 'ponedeljak',
  'utorak', 'sredu', 'cetvrtak', 'danas', 'sutra', 'vece', 'jutro', 'podne', 'sat', 'sata', 'dan', 'dana', 'noc',
  'veceras', 'pse', 'psa', 'psom', 'psima', 'psu', 'mene', 'nas', 'njega', 'nju', 'nesto', 'neko', 'neki', 'neku',
  'koje', 'koji', 'koju', 'kom', 'kojem', 'kome', 'ovo', 'to', 'tome', 'ovome', 'tamo', 'ovde', 'gde', 'mom', 'mojoj',
  'mojem', 'tvom', 'stan', 'stanu', 'kucu', 'kuci', 'zgradu', 'autu', 'avionu', 'vozu', 'autobusu', 'brodu', 'primer',
  'redu', 'toku', 'potrazi', 'kupovinu', 'posetu', 'goste', 'gostima', 'brzinu', 'januar', 'februar', 'mart', 'april',
  'maj', 'jun', 'jul', 'avgust', 'septembar', 'oktobar', 'novembar', 'decembar', 'the', 'my', 'me', 'town', 'city',
  'center', 'centre', 'weekend', 'pet', 'friendly', 'dog', 'dogs', 'veterinara', 'ambulantu', 'prodavnicu',
]);

export function matchesKeyword<T>(set: KeywordSet<T>, token: string): boolean {
  return !!(set.exact?.includes(token) || set.prefix?.some((prefix) => !prefix.includes(' ') && token.startsWith(prefix)));
}

/** Phrases and prefixes with a space, against the folded message padded with spaces (" crnu goru "). */
export function matchesPhrase<T>(set: KeywordSet<T>, paddedText: string): boolean {
  return !!(
    set.phrases?.some((phrase) => paddedText.includes(` ${phrase} `)) ||
    set.prefix?.some((prefix) => prefix.includes(' ') && paddedText.includes(` ${prefix}`))
  );
}
