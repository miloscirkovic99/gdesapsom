import { pluralForm, RouteConstants } from '@gde/shared/util';
import {
  categoryPath,
  PetFriendlyCategory,
  PetFriendlyCity,
  PetFriendlyPage,
} from './pet-friendly-pages';

/**
 * The visible copy of the hub pages, in Serbian and English.
 *
 * It lives here rather than in rs.json / en.json because it is long, is built
 * from the city and category (case endings, plural forms, live counts) and is
 * only needed by the lazy hub page: in the translation files it would be
 * downloaded on every page of the site. Short shared labels (CTA buttons)
 * still come from Transloco.
 *
 * Facts stay general on purpose: rules differ per venue and change, so the
 * copy sends readers to each listing and to the host instead of promising
 * fees, sizes or indoor access.
 */

export type CopyLang = 'sr' | 'en';

/** Transloco's 'rs' / 'en' to the language of this copy. */
export function copyLang(translocoLang: string | null | undefined): CopyLang {
  return translocoLang?.startsWith('en') ? 'en' : 'sr';
}

/** What the page knows about its listings once the API has answered. */
export interface ListingFacts {
  /** Exact number of listings behind the page; null while loading or after an error. */
  total: number | null;
  /** Names of the first listings, for answers like "Na primer A, B i C." */
  examples: readonly string[];
}

export interface FaqItem {
  question: string;
  /** Plain text: it is also the FAQPage answer in the JSON-LD. */
  answer: string;
  /** Shown under the answer; not part of the structured data. */
  link?: { label: string; path: string };
}

export interface PageCopy {
  h1: string;
  lead: string;
  intro: readonly string[];
  listHeading: string;
  tips: { heading: string; items: readonly string[] } | null;
  /** "Na Gde sa psom je trenutno 12 kafića u Novom Sadu." */
  countLine(total: number): string;
  /** Shown instead of the list when the page has no listings yet. */
  emptyText: string;
  faq(facts: ListingFacts): FaqItem[];
}

const ADD_SPOT_PATH = `/${RouteConstants.addSpot}`;
const BUSINESS_PATH = `/${RouteConstants.business}`;
const PARKS_PATH = `/${RouteConstants.petParks}`;
const VETS_PATH = `/${RouteConstants.vet_clinics}`;
/** The site's most read article; the accommodation hub sends travellers to it. */
const EU_TRAVEL_POST_PATH = '/blog/nova-eu-pravila-putovanje-pas-april-2026';

const SERBIA: Record<CopyLang, string> = { sr: 'u Srbiji', en: 'in Serbia' };

/** "A, B i C" / "A, B and C". */
function joinNames(names: readonly string[], lang: CopyLang): string {
  if (names.length <= 1) return names.join('');
  const last = names[names.length - 1];
  return `${names.slice(0, -1).join(', ')} ${lang === 'sr' ? 'i' : 'and'} ${last}`;
}

/**
 * "12 kafića" / "12 cafés". `forms` is [one, few, many] in Serbian and
 * [one, other] in English, matching `pluralForm` from the util lib.
 */
function countNoun(total: number, forms: readonly string[], lang: CopyLang): string {
  const form = pluralForm(total, lang === 'sr' ? 'rs' : 'en');
  if (lang === 'en') return `${total} ${form === 'one' ? forms[0] : forms[1]}`;
  return `${total} ${forms[form === 'one' ? 0 : form === 'few' ? 1 : 2]}`;
}

function countLine(total: number, forms: readonly string[], where: string, lang: CopyLang): string {
  const noun = countNoun(total, forms, lang);
  if (lang === 'en') return `Gde sa psom currently lists ${noun} ${where}.`;
  // 2-4 take a plural verb ("su 3 kafića"); 1 and 5+ a singular one ("je 12 kafića").
  const verb = pluralForm(total, 'rs') === 'few' ? 'su' : 'je';
  return `Na Gde sa psom ${verb} trenutno ${noun} ${where}.`;
}

// ── Categories ──────────────────────────────────────────────────────────────

interface CategoryCopy {
  /** sr: [one, few, many]; en: [one, other]. */
  countForms: readonly string[];
  /** sr: "nijednog kafića" (after "nema"); en: "cafés" (after "No"). */
  none: string;
  /** `where` is "u Novom Sadu" / "in Novi Sad", or null on the national hub. */
  h1(where: string | null): string;
  lead(where: string | null): string;
  intro(where: string | null): string[];
  listHeading(where: string | null): string;
  tips: { heading: string; items: string[] };
  /** Questions specific to the category; the shared ones are added around them. */
  questions(where: string | null): FaqItem[];
  /** "Koji kafići u Novom Sadu primaju pse?" */
  examplesQuestion(where: string | null): string;
  /** "Koliko pet friendly kafića ima u Novom Sadu?"; `where` always names a place here. */
  countQuestion(where: string): string;
  addQuestion: string;
  addAnswer: string;
}

const at = (where: string | null): string => (where ? ` ${where}` : '');

const CATEGORY_COPY: Readonly<Record<string, Record<CopyLang, CategoryCopy>>> = {
  kafici: {
    sr: {
      countForms: ['pet friendly kafić', 'pet friendly kafića', 'pet friendly kafića'],
      none: 'nijednog kafića',
      h1: (where) => `Pet friendly kafići ${where ?? SERBIA.sr}`,
      lead: (where) =>
        `Kafići i kafeterije${at(where)} u koje možete sa psom. Za svaki piše koje veličine pasa su dobrodošle i da li ima baštu, pa unapred znate gde ćete sesti.`,
      intro: (where) => [
        where
          ? `Kafa sa psom ne mora da bude kafa za poneti. Na ovoj stranici su kafići ${where} koji primaju pse, a za svaki navodimo koje veličine pasa su dobrodošle i da li ima baštu, uz adresu, kontakt i lokaciju na mapi.`
          : 'Kafa sa psom ne mora da bude kafa za poneti. Sve više kafića u Srbiji prima pse, ali pravila retko negde pišu: u nekima su dobrodošli samo mali psi, u nekima samo u bašti. Zato za svaki kafić na ovoj listi navodimo koje pse prima i da li ima baštu, uz adresu, kontakt i lokaciju na mapi.',
        'Ako vam je važno da pas bude sa vama i unutra, pitajte osoblje pri dolasku, jer se pravila za unutrašnji prostor razlikuju od kafića do kafića.',
      ],
      listHeading: (where) => `Kafići${at(where)} koji primaju pse`,
      tips: {
        heading: 'Kafić sa psom: kratak bonton',
        items: [
          'Držite psa na kratkom povocu, ispod stola i van prolaza za osoblje.',
          'Ponesite vodu i činiju ili pitajte osoblje da li je imaju.',
          'Ako je pas nemiran ili laje, prošetajte ga pa se vratite.',
          'Pokupite za psom, i u bašti i ispred kafića.',
        ],
      },
      questions: () => [
        {
          question: 'Kako da znam da li kafić prima pse?',
          answer:
            'Svi kafići na ovoj stranici su prijavljeni kao pet friendly. Kod svakog piše da li prima pse svih veličina ili samo male pse i da li ima baštu. Pravila se ponekad menjaju, pa ako niste sigurni, pozovite kafić pre dolaska.',
        },
        {
          question: 'Da li psi smeju u kafić ili samo u baštu?',
          answer:
            'Zavisi od kafića. Neki primaju pse i unutra, a neki samo u bašti. Kod svakog kafića piše da li ima baštu, a za boravak unutra pitajte osoblje.',
        },
      ],
      examplesQuestion: (where) => `Koji kafići${at(where)} primaju pse?`,
      countQuestion: (where) => `Koliko pet friendly kafića ima ${where}?`,
      addQuestion: 'Kako da dodam kafić koji prima pse?',
      addAnswer:
        'Popunite formu „Dodaj lokaciju“, bez registracije. Proverimo podatke i objavimo kafić. Ako ste vlasnik kafića, pogledajte i stranicu Za biznise.',
    },
    en: {
      countForms: ['pet-friendly café', 'pet-friendly cafés'],
      none: 'cafés',
      h1: (where) => `Pet-friendly cafés ${where ?? SERBIA.en}`,
      lead: (where) =>
        `Cafés${at(where)} where you can bring your dog. Each one shows which dog sizes are welcome and whether it has outdoor seating, so you know where to sit before you go.`,
      intro: (where) => [
        where
          ? `Coffee with your dog does not have to be coffee to go. This page lists the cafés ${where} that welcome dogs, with the dog sizes they accept, whether they have outdoor seating, the address, contact and a map.`
          : 'Coffee with your dog does not have to be coffee to go. More and more cafés in Serbia welcome dogs, but the rules are rarely written down: some take small dogs only, some only on the terrace. That is why every café on this list shows which dogs it accepts and whether it has outdoor seating, with the address, contact and a map.',
        'If you want your dog with you indoors, ask the staff when you arrive: indoor rules differ from café to café.',
      ],
      listHeading: (where) => `Cafés${at(where)} that welcome dogs`,
      tips: {
        heading: 'Café etiquette with a dog',
        items: [
          'Keep your dog on a short leash, under the table and out of the staff’s way.',
          'Bring water and a bowl, or ask the staff if they have one.',
          'If your dog gets restless or barks, take a short walk and come back.',
          'Pick up after your dog, on the terrace and outside the café.',
        ],
      },
      questions: () => [
        {
          question: 'How do I know a café accepts dogs?',
          answer:
            'Every café on this page is listed as pet-friendly. Each one shows whether it accepts dogs of all sizes or small dogs only, and whether it has outdoor seating. Rules sometimes change, so call ahead if you are not sure.',
        },
        {
          question: 'Can dogs go inside or only on the terrace?',
          answer:
            'It depends on the café. Some welcome dogs indoors, others only outside. Each listing shows whether there is outdoor seating; for indoors, ask the staff.',
        },
      ],
      examplesQuestion: (where) => `Which cafés${at(where)} welcome dogs?`,
      countQuestion: (where) => `How many pet-friendly cafés are there ${where}?`,
      addQuestion: 'How do I add a café that welcomes dogs?',
      addAnswer:
        'Fill in the “Add a place” form, no sign-up needed. We check the details and publish the café. If you own the café, see the For businesses page too.',
    },
  },

  restorani: {
    sr: {
      countForms: ['pet friendly restoran', 'pet friendly restorana', 'pet friendly restorana'],
      none: 'nijednog restorana',
      h1: (where) => `Pet friendly restorani ${where ?? SERBIA.sr}`,
      lead: (where) =>
        `Restorani i splavovi${at(where)} u kojima su psi dobrodošli. Za svaki piše koje veličine pasa prima i da li ima baštu, uz kontakt za rezervaciju.`,
      intro: (where) => [
        where
          ? `Ručak ili večera napolju ne znače da pas mora da ostane kod kuće. Na ovoj stranici su restorani ${where} koji primaju pse, a za svaki piše koje veličine pasa su dobrodošle i da li ima baštu, uz adresu i kontakt za rezervaciju.`
          : 'Ručak ili večera napolju ne znače da pas mora da ostane kod kuće. Na ovoj listi su restorani u Srbiji koji primaju pse, od gradskih restorana sa baštom do splavova na reci. Za svaki piše koje veličine pasa su dobrodošle i da li ima baštu.',
        'Kada rezervišete sto, recite da dolazite sa psom. Osoblje će vam tako dati mesto gde pas ima prostora i ne smeta drugim gostima.',
      ],
      listHeading: (where) => `Restorani${at(where)} koji primaju pse`,
      tips: {
        heading: 'Restoran sa psom: šta da ponesete',
        items: [
          'Povodac i prostirku na koju pas može da legne pored stola.',
          'Činiju za vodu i nešto za žvakanje, da pas mirno sačeka dok jedete.',
          'Kesice, za šetnju pre i posle obroka.',
          'Prošetajte psa pre dolaska, da bude miran za stolom.',
        ],
      },
      questions: () => [
        {
          question: 'Da li treba najaviti psa pri rezervaciji?',
          answer:
            'Preporučujemo. Restoran vam tako može dati sto u bašti ili u delu gde pas ima mesta, a vi izbegavate iznenađenje na vratima.',
        },
        {
          question: 'Mogu li u restoran sa velikim psom?',
          answer:
            'Kod svakog restorana piše da li prima pse svih veličina ili samo male pse. Ako niste sigurni, pozovite restoran pre dolaska.',
        },
      ],
      examplesQuestion: (where) => `Koji restorani${at(where)} primaju pse?`,
      countQuestion: (where) => `Koliko pet friendly restorana ima ${where}?`,
      addQuestion: 'Kako da dodam restoran koji prima pse?',
      addAnswer:
        'Popunite formu „Dodaj lokaciju“, bez registracije. Proverimo podatke i objavimo restoran. Ako ste vlasnik restorana, pogledajte i stranicu Za biznise.',
    },
    en: {
      countForms: ['pet-friendly restaurant', 'pet-friendly restaurants'],
      none: 'restaurants',
      h1: (where) => `Pet-friendly restaurants ${where ?? SERBIA.en}`,
      lead: (where) =>
        `Restaurants and river rafts${at(where)} where dogs are welcome. Each one shows which dog sizes it accepts and whether it has outdoor seating, plus a contact for bookings.`,
      intro: (where) => [
        where
          ? `Eating out does not mean leaving your dog at home. This page lists the restaurants ${where} that welcome dogs, with the dog sizes they accept, whether they have outdoor seating, the address and a contact for bookings.`
          : 'Eating out does not mean leaving your dog at home. This list covers restaurants in Serbia that welcome dogs, from city restaurants with a garden to rafts on the river. Each one shows which dog sizes are welcome and whether it has outdoor seating.',
        'When you book a table, mention that you are coming with a dog. The staff can then seat you where your dog has room and does not bother other guests.',
      ],
      listHeading: (where) => `Restaurants${at(where)} that welcome dogs`,
      tips: {
        heading: 'Eating out with a dog: what to bring',
        items: [
          'A leash and a mat your dog can lie on next to the table.',
          'A water bowl and something to chew, so your dog waits calmly while you eat.',
          'Poop bags, for the walk before and after the meal.',
          'Walk your dog before you arrive, so it settles at the table.',
        ],
      },
      questions: () => [
        {
          question: 'Should I mention my dog when booking?',
          answer:
            'We recommend it. The restaurant can give you a table on the terrace or where your dog has room, and you avoid a surprise at the door.',
        },
        {
          question: 'Can I bring a large dog to a restaurant?',
          answer:
            'Each restaurant shows whether it accepts dogs of all sizes or small dogs only. If you are not sure, call the restaurant before you go.',
        },
      ],
      examplesQuestion: (where) => `Which restaurants${at(where)} welcome dogs?`,
      countQuestion: (where) => `How many pet-friendly restaurants are there ${where}?`,
      addQuestion: 'How do I add a restaurant that welcomes dogs?',
      addAnswer:
        'Fill in the “Add a place” form, no sign-up needed. We check the details and publish the restaurant. If you own the restaurant, see the For businesses page too.',
    },
  },

  barovi: {
    sr: {
      countForms: ['pet friendly bar', 'pet friendly bara', 'pet friendly barova'],
      none: 'nijednog bara ni paba',
      h1: (where) => `Pet friendly barovi i pabovi ${where ?? SERBIA.sr}`,
      lead: (where) =>
        `Barovi i pabovi${at(where)} u koje možete sa psom, sa podacima o veličini pasa i bašti, adresom i kontaktom.`,
      intro: (where) => [
        where
          ? `Piće posle posla ili utakmica u pabu ne moraju da budu bez psa. Na ovoj stranici su barovi i pabovi ${where} u kojima su psi dobrodošli, sa podacima o veličini pasa i bašti.`
          : 'Piće posle posla ili utakmica u pabu ne moraju da budu bez psa. Na ovoj listi su barovi i pabovi u Srbiji u kojima su psi dobrodošli, sa podacima o veličini pasa i bašti.',
        'Uveče je u barovima gužva i muzika je glasnija, pa ako je vaš pas osetljiv na buku, birajte mesto sa baštom ili ranije sate.',
      ],
      listHeading: (where) => `Barovi i pabovi${at(where)} koji primaju pse`,
      tips: {
        heading: 'Bar sa psom: na šta da pazite',
        items: [
          'Izbegavajte najveću gužvu ako pas nije navikao na ljude i buku.',
          'Ponesite vodu za psa; alkohol i slane grickalice nisu za pse.',
          'Pazite šta pas pokupi sa poda, posebno staklo i čepove.',
          'Držite psa uz sebe, van prolaza do šanka.',
        ],
      },
      questions: () => [
        {
          question: 'Da li pet friendly barovi primaju pse i uveče?',
          answer:
            'Uglavnom da, ali to zavisi od objekta i događaja. Kada je u baru koncert ili velika gužva, pozovite pre dolaska.',
        },
        {
          question: 'Kako da znam koje veličine pasa su dozvoljene?',
          answer: 'Kod svakog bara i paba piše da li prima pse svih veličina ili samo male pse.',
        },
      ],
      examplesQuestion: (where) => `Koji barovi i pabovi${at(where)} primaju pse?`,
      countQuestion: (where) => `Koliko pet friendly barova i pabova ima ${where}?`,
      addQuestion: 'Kako da dodam bar koji prima pse?',
      addAnswer:
        'Popunite formu „Dodaj lokaciju“, bez registracije. Proverimo podatke i objavimo bar. Ako ste vlasnik, pogledajte i stranicu Za biznise.',
    },
    en: {
      countForms: ['pet-friendly bar', 'pet-friendly bars'],
      none: 'bars or pubs',
      h1: (where) => `Pet-friendly bars and pubs ${where ?? SERBIA.en}`,
      lead: (where) =>
        `Bars and pubs${at(where)} where you can bring your dog, with the dog sizes they accept, outdoor seating, address and contact.`,
      intro: (where) => [
        where
          ? `A drink after work or a match at the pub does not have to happen without your dog. This page lists the bars and pubs ${where} that welcome dogs, with dog sizes and outdoor seating.`
          : 'A drink after work or a match at the pub does not have to happen without your dog. This list covers bars and pubs in Serbia that welcome dogs, with dog sizes and outdoor seating.',
        'Bars get crowded and loud in the evening, so if your dog is sensitive to noise, pick a place with outdoor seating or go earlier.',
      ],
      listHeading: (where) => `Bars and pubs${at(where)} that welcome dogs`,
      tips: {
        heading: 'Bars with a dog: what to watch',
        items: [
          'Avoid the busiest hours if your dog is not used to crowds and noise.',
          'Bring water for your dog; alcohol and salty snacks are not for dogs.',
          'Watch what your dog picks up from the floor, especially glass and bottle caps.',
          'Keep your dog close to you, out of the way to the bar.',
        ],
      },
      questions: () => [
        {
          question: 'Do pet-friendly bars accept dogs in the evening?',
          answer:
            'Mostly yes, but it depends on the venue and the event. When there is a concert or a big crowd, call ahead.',
        },
        {
          question: 'How do I know which dog sizes are allowed?',
          answer: 'Each bar and pub shows whether it accepts dogs of all sizes or small dogs only.',
        },
      ],
      examplesQuestion: (where) => `Which bars and pubs${at(where)} welcome dogs?`,
      countQuestion: (where) => `How many pet-friendly bars and pubs are there ${where}?`,
      addQuestion: 'How do I add a bar that welcomes dogs?',
      addAnswer:
        'Fill in the “Add a place” form, no sign-up needed. We check the details and publish the bar. If you own it, see the For businesses page too.',
    },
  },

  smestaj: {
    sr: {
      countForms: ['objekat za smeštaj', 'objekta za smeštaj', 'objekata za smeštaj'],
      none: 'nijednog objekta za smeštaj',
      h1: (where) => `Pet friendly smeštaj ${where ?? SERBIA.sr}`,
      lead: (where) =>
        `Hoteli, apartmani i moteli${at(where)} koji primaju pse i druge kućne ljubimce. Za svaki objekat piše koje veličine pasa su dobrodošle, gde se nalazi i kako da ga kontaktirate.`,
      intro: (where) =>
        where
          ? [
              `Putovanje sa psom počinje pitanjem gde ćete spavati. Na ovoj stranici su hoteli, apartmani i moteli ${where} koji primaju pse, a za svaki objekat piše koje veličine pasa su dobrodošle, uz adresu, kontakt i lokaciju na mapi.`,
              'Pravila se razlikuju od objekta do objekta: negde se boravak psa doplaćuje, negde je dozvoljen samo jedan pas. Uslove za psa zato uvek potvrdite direktno sa domaćinom pre rezervacije.',
            ]
          : [
              'Putovanje sa psom počinje pitanjem gde ćete spavati. Mnogi hoteli i apartmani u Srbiji primaju kućne ljubimce, ali pravila se razlikuju: negde su dobrodošli samo mali psi, negde se boravak psa doplaćuje, a negde pas ne sme da ostane sam u sobi. Ovde je smeštaj koji prima pse izdvojen na jednom mestu.',
              'Pregledajte smeštaj po gradu ili otvorite objekat da vidite adresu, kontakt i lokaciju na mapi. Pre rezervacije uslove za psa uvek potvrdite direktno sa domaćinom, jer se pravila mogu promeniti.',
            ],
      listHeading: (where) => `Smeštaj${at(where)} koji prima pse`,
      tips: {
        heading: 'Šta da proverite pre rezervacije smeštaja sa psom',
        items: [
          'Veličinu i broj pasa: da li su dobrodošli i veliki psi i koliko ljubimaca smete da povedete.',
          'Doplatu: da li se boravak psa naplaćuje po noćenju ili jednokratno.',
          'Da li pas sme da ostane sam u sobi dok ste na večeri ili izletu.',
          'Zajedničke prostorije: da li pas sme u restoran, na terasu ili u dvorište i da li je dvorište ograđeno.',
          'Dokumenta: pas treba da bude čipovan i vakcinisan protiv besnila, a pojedini objekti traže na uvid pasoš ili knjižicu.',
        ],
      },
      questions: (where) => [
        {
          question: `Kako da pronađem smeštaj koji prima pse ${where ?? SERBIA.sr}?`,
          answer: where
            ? `Na ovoj stranici su hoteli, apartmani i moteli ${where} koji primaju pse. Otvorite objekat da vidite adresu, kontakt i koje veličine pasa su dozvoljene.`
            : 'Na ovoj stranici su hoteli, apartmani i moteli koji primaju pse. Izaberite grad ili pregledajte listu, otvorite objekat i proverite koje veličine pasa su dozvoljene.',
        },
        {
          question: 'Da li hoteli koji primaju kućne ljubimce naplaćuju boravak psa?',
          answer:
            'Zavisi od objekta. Neki smeštaj prima pse bez doplate, a neki naplaćuje dnevnu ili jednokratnu naknadu. Iznos proverite sa domaćinom pri rezervaciji.',
        },
        {
          question: 'Da li pet friendly smeštaj prima i velike pse?',
          answer: 'Neki da, neki ne. Kod svakog objekta piše da li prima pse svih veličina ili samo male pse.',
        },
        ...(where
          ? []
          : [
              {
                question: 'Šta je potrebno za putovanje sa psom van Srbije?',
                answer:
                  'Pas mora da ima mikročip i važeću vakcinu protiv besnila, a pojedine zemlje traže i dodatna dokumenta. Šta važi za Evropsku uniju pročitajte u našem vodiču.',
                link: { label: 'Putovanje sa psom u EU', path: EU_TRAVEL_POST_PATH },
              },
            ]),
      ],
      examplesQuestion: (where) => `Koji hoteli i apartmani${at(where)} primaju pse?`,
      countQuestion: (where) => `Koliko ima smeštaja koji prima pse ${where}?`,
      addQuestion: 'Kako da dodam smeštaj koji prima pse?',
      addAnswer:
        'Ako ste vlasnik ili ste boravili u smeštaju koji prima pse, dodajte ga preko forme „Dodaj lokaciju“. Unos je besplatan, a podatke proverimo pre objave.',
    },
    en: {
      countForms: ['place to stay', 'places to stay'],
      none: 'places to stay',
      h1: (where) => `Pet-friendly places to stay ${where ?? SERBIA.en}`,
      lead: (where) =>
        `Hotels, apartments and motels${at(where)} that welcome dogs and other pets. Each one shows which dog sizes are welcome, where it is and how to contact it.`,
      intro: (where) =>
        where
          ? [
              `A trip with your dog starts with where you will sleep. This page lists the hotels, apartments and motels ${where} that welcome dogs, with the dog sizes they accept, the address, contact and a map.`,
              'Rules differ from place to place: some charge for the dog, some allow one dog only. Always confirm the conditions directly with the host before you book.',
            ]
          : [
              'A trip with your dog starts with where you will sleep. Many hotels and apartments in Serbia welcome pets, but the rules differ: some take small dogs only, some charge for the dog, and some do not allow a dog to stay alone in the room. Here the places that accept dogs are gathered in one list.',
              'Browse by city or open a listing to see the address, contact and map. Always confirm the conditions for your dog directly with the host before booking, as rules can change.',
            ],
      listHeading: (where) => `Places to stay${at(where)} that welcome dogs`,
      tips: {
        heading: 'What to check before booking with a dog',
        items: [
          'Size and number of dogs: whether large dogs are welcome and how many pets you can bring.',
          'Fees: whether the dog is charged per night or once.',
          'Whether your dog may stay alone in the room while you are at dinner or on a trip.',
          'Shared areas: whether the dog may enter the restaurant, terrace or yard, and whether the yard is fenced.',
          'Documents: your dog should be microchipped and vaccinated against rabies; some places ask to see the passport or vaccination booklet.',
        ],
      },
      questions: (where) => [
        {
          question: `How do I find accommodation that accepts dogs ${where ?? SERBIA.en}?`,
          answer: where
            ? `This page lists the hotels, apartments and motels ${where} that welcome dogs. Open a listing to see the address, contact and which dog sizes are allowed.`
            : 'This page lists hotels, apartments and motels that welcome dogs. Choose a city or browse the list, open a listing and check which dog sizes are allowed.',
        },
        {
          question: 'Do pet-friendly hotels charge for the dog?',
          answer:
            'It depends on the place. Some accept dogs at no extra cost, others charge a daily or one-time fee. Check the amount with the host when you book.',
        },
        {
          question: 'Do pet-friendly places to stay accept large dogs?',
          answer: 'Some do, some do not. Each listing shows whether it accepts dogs of all sizes or small dogs only.',
        },
        ...(where
          ? []
          : [
              {
                question: 'What does my dog need to travel outside Serbia?',
                answer:
                  'Your dog needs a microchip and a valid rabies vaccination, and some countries ask for more documents. Read our guide for what applies in the European Union.',
                link: { label: 'Travelling to the EU with a dog', path: EU_TRAVEL_POST_PATH },
              },
            ]),
      ],
      examplesQuestion: (where) => `Which hotels and apartments${at(where)} welcome dogs?`,
      countQuestion: (where) => `How many places to stay accept dogs ${where}?`,
      addQuestion: 'How do I add a place to stay that accepts dogs?',
      addAnswer:
        'If you own or have stayed at a place that accepts dogs, add it with the “Add a place” form. It is free, and we check the details before publishing.',
    },
  },
};

// ── Cities ──────────────────────────────────────────────────────────────────

interface CityCopy {
  lead: string;
  intro: string[];
}

const CITY_COPY: Readonly<Record<string, Record<CopyLang, CityCopy>>> = {
  beograd: {
    sr: {
      lead: 'Gde sa psom u Beogradu: kafići, restorani, barovi, splavovi i smeštaj u kojima su psi dobrodošli, sa adresom, kontaktom i pravilima za ljubimce.',
      intro: [
        'Beograd je grad u kome se pas lako uklopi u dan: jutarnja šetnja Ušćem ili Adom Ciganlijom, kafa u bašti, ručak na splavu. Sve više mesta otvara vrata psima, ali pravila se razlikuju od lokala do lokala. Ovde su na jednom mestu kafići, restorani, barovi i smeštaj u Beogradu koji primaju pse.',
        'Za svaki objekat piše koje veličine pasa su dobrodošle i da li ima baštu. Izaberite kategoriju ili pregledajte sva mesta ispod, a za šetnju i trčanje bez povoca pogledajte parkove za pse.',
      ],
    },
    en: {
      lead: 'Where to go with your dog in Belgrade: cafés, restaurants, bars, river rafts and places to stay that welcome dogs, with address, contact and pet rules.',
      intro: [
        'Belgrade makes it easy to bring a dog along: a morning walk at Ušće or Ada Ciganlija, coffee on a terrace, lunch on a river raft. More and more places open their doors to dogs, but the rules differ from venue to venue. Here the cafés, restaurants, bars and places to stay in Belgrade that welcome dogs are gathered in one place.',
        'Each listing shows which dog sizes are welcome and whether there is outdoor seating. Pick a category or browse all places below, and see the dog parks for off-leash walks.',
      ],
    },
  },
  'novi-sad': {
    sr: {
      lead: 'Gde sa psom u Novom Sadu: kafići, restorani, barovi i smeštaj u kojima su psi dobrodošli, sa adresom, kontaktom i pravilima za ljubimce.',
      intro: [
        'Novi Sad je grad po meri šetnje sa psom: kej uz Dunav, Dunavski i Limanski park, Petrovaradinska tvrđava, a Fruška gora je na pola sata vožnje. Kada posle šetnje poželite kafu, ručak ili prenoćište, ovde su mesta u Novom Sadu u kojima je i pas dobrodošao.',
        'Za svaki objekat piše koje veličine pasa su dobrodošle i da li ima baštu. Listu dopunjuju vlasnici pasa i sami objekti, pa ako znate novosadski kafić ili restoran koji prima pse, a nije na listi, dodajte ga.',
      ],
    },
    en: {
      lead: 'Where to go with your dog in Novi Sad: cafés, restaurants, bars and places to stay that welcome dogs, with address, contact and pet rules.',
      intro: [
        'Novi Sad is made for walks with a dog: the Danube quay, the Danube and Liman parks, Petrovaradin Fortress, and Fruška Gora half an hour’s drive away. When you want coffee, lunch or a bed after the walk, here are the places in Novi Sad where your dog is welcome too.',
        'Each listing shows which dog sizes are welcome and whether there is outdoor seating. Dog owners and venues keep the list growing, so if you know a café or restaurant in Novi Sad that welcomes dogs and is missing, add it.',
      ],
    },
  },
  nis: {
    sr: {
      lead: 'Gde sa psom u Nišu: kafići, restorani, barovi i smeštaj u kojima su psi dobrodošli, sa adresom, kontaktom i pravilima za ljubimce.',
      intro: [
        'Niš je lako obići sa psom: šetnja kroz Čair, uz Nišavu ili do Tvrđave, a za ceo dan u prirodi tu su Kamenički vis i Sićevačka i Jelašnička klisura. Kada posle šetnje poželite kafu, ručak ili prenoćište, ovde su mesta u Nišu u kojima je i pas dobrodošao.',
        'Za svaki objekat piše koje veličine pasa su dobrodošle i da li ima baštu. Listu dopunjuju vlasnici pasa i sami objekti, pa ako znate niški kafić ili restoran koji prima pse, a nije na listi, dodajte ga.',
      ],
    },
    en: {
      lead: 'Where to go with your dog in Niš: cafés, restaurants, bars and places to stay that welcome dogs, with address, contact and pet rules.',
      intro: [
        'Niš is easy to explore with a dog: a walk through Čair park, along the Nišava or up to the Fortress, and for a whole day outdoors Kamenički Vis and the Sićevo and Jelašnica gorges. When you want coffee, lunch or a bed after the walk, here are the places in Niš where your dog is welcome too.',
        'Each listing shows which dog sizes are welcome and whether there is outdoor seating. Dog owners and venues keep the list growing, so if you know a café or restaurant in Niš that welcomes dogs and is missing, add it.',
      ],
    },
  },
};

/** Copy for a city that has a hub but no hand-written introduction yet. */
function genericCityCopy(city: PetFriendlyCity, lang: CopyLang): CityCopy {
  if (lang === 'en') {
    return {
      lead: `Where to go with your dog ${city.locative.nameEn}: cafés, restaurants, bars and places to stay that welcome dogs.`,
      intro: [
        `This page gathers the cafés, restaurants, bars and places to stay ${city.locative.nameEn} that welcome dogs. Each listing shows which dog sizes are welcome and whether there is outdoor seating, with the address and contact.`,
      ],
    };
  }
  return {
    lead: `Gde sa psom ${city.locative.nameSr}: kafići, restorani, barovi i smeštaj u kojima su psi dobrodošli.`,
    intro: [
      `Na ovoj stranici su kafići, restorani, barovi i smeštaj ${city.locative.nameSr} koji primaju pse. Za svaki objekat piše koje veličine pasa su dobrodošle i da li ima baštu, uz adresu i kontakt.`,
    ],
  };
}

const PLACE_FORMS: Record<CopyLang, readonly string[]> = {
  sr: ['pet friendly mesto', 'pet friendly mesta', 'pet friendly mesta'],
  en: ['pet-friendly place', 'pet-friendly places'],
};

function categoryLink(category: PetFriendlyCategory, city: PetFriendlyCity, lang: CopyLang): { label: string; path: string } {
  const label =
    lang === 'sr'
      ? `${category.hubLabel.nameSr} ${city.locative.nameSr}`
      : `${category.hubLabel.nameEn} ${city.locative.nameEn}`;
  return { label, path: categoryPath(category, city) };
}

function cityHubCopy(city: PetFriendlyCity, lang: CopyLang, categories: readonly PetFriendlyCategory[]): PageCopy {
  const where = lang === 'sr' ? city.locative.nameSr : city.locative.nameEn;
  const name = lang === 'sr' ? city.name.nameSr : city.name.nameEn;
  const custom = CITY_COPY[city.slug]?.[lang] ?? genericCityCopy(city, lang);
  const cafes = categories.find((category) => category.slug === 'kafici');
  const lodging = categories.find((category) => category.slug === 'smestaj');

  return {
    h1: lang === 'sr' ? `Pet friendly ${name}` : `Pet-friendly ${name}`,
    lead: custom.lead,
    intro: custom.intro,
    listHeading: lang === 'sr' ? `Sva pet friendly mesta ${where}` : `All pet-friendly places ${where}`,
    tips: null,
    countLine: (total) => countLine(total, PLACE_FORMS[lang], where, lang),
    emptyText:
      lang === 'sr'
        ? `Za sada na listi nema nijednog mesta ${where}. Znate kafić, restoran ili smeštaj koji prima pse? Dodajte ga za minut i pomozite drugim vlasnicima pasa.`
        : `No places ${where} are listed yet. Know a café, restaurant or place to stay that welcomes dogs? Add it in a minute and help other dog owners.`,
    faq: (facts) => {
      const items: FaqItem[] = [];

      items.push(
        lang === 'sr'
          ? {
              question: `Gde sa psom ${where}?`,
              answer: `${name} ima kafiće, restorane, barove i smeštaj koji primaju pse. Izaberite kategoriju na ovoj stranici da vidite listu sa adresama i pravilima za pse.${facts.total ? ` ${countLine(facts.total, PLACE_FORMS.sr, where, 'sr')}` : ''}`,
            }
          : {
              question: `Where can I go with my dog ${where}?`,
              answer: `${name} has cafés, restaurants, bars and places to stay that welcome dogs. Pick a category on this page to see the list with addresses and pet rules.${facts.total ? ` ${countLine(facts.total, PLACE_FORMS.en, where, 'en')}` : ''}`,
            },
      );

      if (cafes) {
        items.push(
          lang === 'sr'
            ? {
                question: `Koji kafići ${where} primaju pse?`,
                answer: `Pogledajte stranicu sa pet friendly kafićima ${where}. Kod svakog kafića piše da li prima pse svih veličina i da li ima baštu.`,
                link: categoryLink(cafes, city, lang),
              }
            : {
                question: `Which cafés ${where} welcome dogs?`,
                answer: `See the page with pet-friendly cafés ${where}. Each café shows whether it accepts dogs of all sizes and whether it has outdoor seating.`,
                link: categoryLink(cafes, city, lang),
              },
        );
      }

      if (lodging) {
        items.push(
          lang === 'sr'
            ? {
                question: `Da li ${where} ima smeštaja koji prima pse?`,
                answer: `Hotele, apartmane i motele ${where} koji primaju pse, sa pravilima za ljubimce i kontaktom, pogledajte na stranici o pet friendly smeštaju. Uslove za psa potvrdite sa domaćinom pre rezervacije.`,
                link: categoryLink(lodging, city, lang),
              }
            : {
                question: `Are there places to stay ${where} that accept dogs?`,
                answer: `See the page with pet-friendly places to stay ${where}: hotels, apartments and motels that welcome dogs, with pet rules and contacts. Confirm the conditions with the host before booking.`,
                link: categoryLink(lodging, city, lang),
              },
        );
      }

      items.push(
        lang === 'sr'
          ? {
              question: `Gde ${where} ima parkova za pse?`,
              answer: 'Parkove i ograđene prostore za pse, sa lokacijama, pogledajte na stranici Parkovi za pse.',
              link: { label: 'Parkovi za pse', path: PARKS_PATH },
            }
          : {
              question: `Where are the dog parks ${where}?`,
              answer: 'See the Dog parks page for parks and fenced areas for dogs, with their locations.',
              link: { label: 'Dog parks', path: PARKS_PATH },
            },
        lang === 'sr'
          ? {
              question: `Kako da pronađem veterinara ${where}?`,
              answer: 'Veterinarske ambulante i klinike, sa adresama i telefonima, pogledajte na stranici Veterinari.',
              link: { label: 'Veterinari', path: VETS_PATH },
            }
          : {
              question: `How do I find a vet ${where}?`,
              answer: 'See the Vets page for veterinary clinics with their addresses and phone numbers.',
              link: { label: 'Vets', path: VETS_PATH },
            },
      );

      return items;
    },
  };
}

function categoryHubCopy(category: PetFriendlyCategory, city: PetFriendlyCity | null, lang: CopyLang): PageCopy {
  const copy = CATEGORY_COPY[category.slug]?.[lang];
  if (!copy) throw new Error(`No ${lang} copy for the "${category.slug}" hub`);

  const where = city ? (lang === 'sr' ? city.locative.nameSr : city.locative.nameEn) : null;
  const countWhere = where ?? SERBIA[lang];

  return {
    h1: copy.h1(where),
    lead: copy.lead(where),
    intro: copy.intro(where),
    listHeading: copy.listHeading(where),
    tips: copy.tips,
    countLine: (total) => countLine(total, copy.countForms, countWhere, lang),
    emptyText:
      lang === 'sr'
        ? `Za sada na listi nema ${copy.none} ${countWhere}. Znate neko mesto koje prima pse? Dodajte ga za minut i pomozite drugim vlasnicima pasa.`
        : `No ${copy.none} ${countWhere} are listed yet. Know one that welcomes dogs? Add it in a minute and help other dog owners.`,
    faq: (facts) => {
      const items: FaqItem[] = [...copy.questions(where)];

      if (facts.examples.length) {
        items.push({
          question: copy.examplesQuestion(where),
          answer:
            lang === 'sr'
              ? `Na primer ${joinNames(facts.examples, lang)}. Celu listu, sa adresama i pravilima za pse, pogledajte na ovoj stranici.`
              : `For example ${joinNames(facts.examples, lang)}. See the full list with addresses and pet rules on this page.`,
        });
      }

      if (facts.total) {
        items.push({
          question: copy.countQuestion(countWhere),
          answer: `${countLine(facts.total, copy.countForms, countWhere, lang)} ${
            lang === 'sr' ? 'Lista se stalno dopunjuje novim mestima.' : 'New places are added all the time.'
          }`,
        });
      }

      items.push({
        question: copy.addQuestion,
        answer: copy.addAnswer,
        link: { label: lang === 'sr' ? 'Dodaj lokaciju' : 'Add a place', path: ADD_SPOT_PATH },
      });

      return items;
    },
  };
}

export function pageCopy(
  page: PetFriendlyPage,
  lang: CopyLang,
  categories: readonly PetFriendlyCategory[],
): PageCopy {
  if (page.category) return categoryHubCopy(page.category, page.city, lang);
  if (page.city) return cityHubCopy(page.city, lang, categories);
  throw new Error(`Hub page ${page.path} has neither a city nor a category`);
}

// ── Page chrome ─────────────────────────────────────────────────────────────

export interface UiCopy {
  faqTitle: string;
  moreTitle: string;
  forYourDogTitle: string;
  dogParks: string;
  vets: string;
  /** City hub: "Šta tražite u Novom Sadu?"; national hub: "Kafići po gradovima". */
  subnavTitle(page: PetFriendlyPage): string;
  sameCityTitle(city: PetFriendlyCity): string;
  otherCitiesTitle(category: PetFriendlyCategory): string;
  otherCategoriesTitle: string;
  citiesTitle: string;
  parksTitle(city: PetFriendlyCity): string;
  vetsTitle(city: PetFriendlyCity): string;
  allParks: string;
  allVets: string;
  allSpots: string;
  loadMore: string;
  listError: string;
  retry: string;
  addTitle: string;
  addLead: string;
  addCta: string;
  businessTitle: string;
  businessLead: string;
  businessCta: string;
}

const UI: Record<CopyLang, UiCopy> = {
  sr: {
    faqTitle: 'Česta pitanja',
    moreTitle: 'Pretražite dalje',
    forYourDogTitle: 'Za vašeg psa',
    dogParks: 'Parkovi za pse',
    vets: 'Veterinari',
    subnavTitle: (page) =>
      page.kind === 'city' && page.city
        ? `Šta tražite ${page.city.locative.nameSr}?`
        : `${page.category?.label.nameSr ?? 'Mesta'} po gradovima`,
    sameCityTitle: (city) => `Još ${city.locative.nameSr}`,
    otherCitiesTitle: (category) => `${category.label.nameSr} u drugim gradovima`,
    otherCategoriesTitle: 'Ostale kategorije',
    citiesTitle: 'Gradovi',
    parksTitle: (city) => `Parkovi za pse ${city.locative.nameSr}`,
    vetsTitle: (city) => `Veterinari ${city.locative.nameSr}`,
    allParks: 'Svi parkovi za pse',
    allVets: 'Svi veterinari',
    allSpots: 'Sva pet friendly mesta',
    loadMore: 'Prikaži još',
    listError: 'Lista trenutno nije dostupna. Pokušajte ponovo za nekoliko trenutaka.',
    retry: 'Pokušaj ponovo',
    addTitle: 'Znate mesto koje nije na listi?',
    addLead: 'Dodajte ga za minut, bez naloga. Proverimo podatke i objavimo, pa sledeći vlasnik psa ne mora da pita.',
    addCta: 'Dodaj lokaciju',
    businessTitle: 'Vodite kafić, restoran ili smeštaj?',
    businessLead: 'Besplatan unos i vidljivost kod ljudi koji biraju gde će sa psom.',
    businessCta: 'Za biznise',
  },
  en: {
    faqTitle: 'Frequently asked questions',
    moreTitle: 'Keep exploring',
    forYourDogTitle: 'For your dog',
    dogParks: 'Dog parks',
    vets: 'Vets',
    subnavTitle: (page) =>
      page.kind === 'city' && page.city
        ? `What are you looking for ${page.city.locative.nameEn}?`
        : `${page.category?.label.nameEn ?? 'Places'} by city`,
    sameCityTitle: (city) => `More ${city.locative.nameEn}`,
    otherCitiesTitle: (category) => `${category.label.nameEn} in other cities`,
    otherCategoriesTitle: 'Other categories',
    citiesTitle: 'Cities',
    parksTitle: (city) => `Dog parks ${city.locative.nameEn}`,
    vetsTitle: (city) => `Vets ${city.locative.nameEn}`,
    allParks: 'All dog parks',
    allVets: 'All vets',
    allSpots: 'All pet-friendly places',
    loadMore: 'Show more',
    listError: 'The list is not available right now. Please try again in a moment.',
    retry: 'Try again',
    addTitle: 'Know a place that is not listed?',
    addLead: 'Add it in a minute, no account needed. We check and publish it, so the next dog owner does not have to ask.',
    addCta: 'Add a place',
    businessTitle: 'Run a café, restaurant or place to stay?',
    businessLead: 'A free listing, seen by people choosing where to go with their dog.',
    businessCta: 'For businesses',
  },
};

export function uiCopy(lang: CopyLang): UiCopy {
  return UI[lang];
}

/** Paths the page chrome links to, kept here with the labels that describe them. */
export const HUB_CHROME_PATHS = {
  addSpot: ADD_SPOT_PATH,
  business: BUSINESS_PATH,
  parks: PARKS_PATH,
  vets: VETS_PATH,
  allSpots: `/${RouteConstants.allSpots}`,
} as const;

/** Whether every category and city in the taxonomy has copy in both languages. */
export function missingCopy(categories: readonly PetFriendlyCategory[]): string[] {
  const missing: string[] = [];
  for (const category of categories) {
    for (const lang of ['sr', 'en'] as const) {
      if (!CATEGORY_COPY[category.slug]?.[lang]) missing.push(`${category.slug}/${lang}`);
    }
  }
  return missing;
}
