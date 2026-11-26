import type { CountryCode } from '../countries';
import type { Localized } from '../lang';
import type { EntryPoints, RuleRecord, Ruleset } from './rule.models';
import { SOURCES } from './sources';

/**
 * Travel rules for taking a dog from Serbia abroad, non-commercial movement
 * only. Every record was compared with its sources on `VERIFIED`; the
 * research notes behind them are in docs/pet-trip/README.md.
 *
 * To change a rule: edit the record in both languages, bump its `version`,
 * set `verifiedAt` to the day you compared it with the source, and raise
 * `RULESET.version`. A record past `reviewBy` is shown as "needs
 * verification" until someone does.
 */
const VERIFIED = '2026-10-23';
/** EU law and national law: half a year. */
const REVIEW_LAW = '2027-04-23';
/** Carrier policies and entry-point lists change more often. */
const REVIEW_PRACTICE = '2027-01-23';

/** Pet entry points of the EU countries a trip from Serbia can enter first. */
const ENTRY_POINTS: EntryPoints = {
  HR: {
    road: {
      RS: ['Bajakovo', 'Batina', 'Erdut', 'Ilok', 'Tovarnik'],
      any: [
        'Bajakovo', 'Batina', 'Erdut', 'Gunja', 'Hrvatska Dubica', 'Hrvatska Kostajnica', 'Ilok', 'Jasenovac',
        'Kamensko', 'Karasovići', 'Klek', 'Ličko Petrovo Selo', 'Maljevac', 'Metković', 'Nova Sela',
        'Slavonski Brod', 'Slavonski Šamac', 'Stara Gradiška', 'Strmica', 'Svilaj', 'Tovarnik', 'Vinjani Donji',
        'Vinjani Gornji', 'Vukovar', 'Zaton Doli', 'Županja',
      ],
    },
    rail: ['Tovarnik'],
    air: ['Zagreb', 'Split', 'Dubrovnik', 'Zadar', 'Pula', 'Rijeka', 'Osijek', 'Brač'],
    asOf: '2025-05-24',
    current: true,
    sourceIds: ['hr-entry-points-2023', 'hr-entry-points-2025', 'hr-customs-pets'],
  },
  HU: {
    road: {
      RS: [
        'Röszke', 'Tompa', 'Hercegszántó',
        { sr: 'Bácsalmás (8–18 h)', en: 'Bácsalmás (8:00–18:00)' },
        { sr: 'Tiszasziget (8–18 h)', en: 'Tiszasziget (8:00–18:00)' },
      ],
    },
    rail: ['Kelebia', 'Röszke'],
    air: [{ sr: 'Budimpešta (Liszt Ferenc)', en: 'Budapest (Liszt Ferenc)' }, { sr: 'Debrecin', en: 'Debrecen' }, 'Sármellék'],
    asOf: '2017-05-24',
    current: false,
    sourceIds: ['hu-entry-points-2017'],
  },
  RO: {
    road: { RS: ['Stamora Moravița'] },
    air: [{ sr: 'Bukurešt (Henri Coandă)', en: 'Bucharest (Henri Coandă)' }, { sr: 'Kluž (na zahtev)', en: 'Cluj (on request)' }],
    asOf: null,
    current: false,
    sourceIds: ['ro-entry-points'],
  },
  BG: {
    road: {
      RS: [
        'Kalotina',
        { sr: 'Vrška Čuka', en: 'Vrashka Chuka' },
        'Bregovo',
        { sr: 'Strezimirovci', en: 'Strezimirovtsi' },
        { sr: 'Oltomanci', en: 'Oltomantsi' },
      ],
    },
    rail: ['Dimitrovgrad'],
    air: [{ sr: 'Sofija', en: 'Sofia' }, 'Varna', 'Burgas', 'Plovdiv'],
    asOf: '2009-10-06',
    current: false,
    sourceIds: ['bg-entry-points-2009'],
  },
  GR: {
    road: { MK: [{ sr: 'Evzoni', en: 'Evzonoi' }] },
    rail: ['Idomeni'],
    air: [{ sr: 'Atina', en: 'Athens' }, { sr: 'Solun', en: 'Thessaloniki' }],
    asOf: '2006',
    current: false,
    sourceIds: ['gr-entry-points-2006'],
  },
  AT: {
    air: [
      { sr: 'Beč (Schwechat)', en: 'Vienna (Schwechat)' },
      { sr: 'Linc', en: 'Linz' },
      { sr: 'Salcburg', en: 'Salzburg' },
      { sr: 'Insbruk', en: 'Innsbruck' },
      { sr: 'Grac', en: 'Graz' },
      'Klagenfurt',
    ],
    asOf: '2026-05-20',
    current: true,
    sourceIds: ['at-bmf-pets-2026'],
  },
};

const NON_COMMERCIAL = 'non-commercial' as const;

/** Chip and vaccination for a destination outside the EU, known only from its older official pages. */
function nonEuDogRules(code: CountryCode, name: Localized, sourceIds: readonly string[], dated: Localized): RuleRecord[] {
  return [
    {
      id: `${code.toLowerCase()}.microchip`,
      version: 1,
      title: { sr: `Mikročip (${name.sr})`, en: `Microchip (${name.en})` },
      summary: {
        sr: `Prema zvaničnim pravilima koja ${name.sr} objavljuje, pas mora imati mikročip.`,
        en: `Under the official rules ${name.en} publishes, the dog must have a microchip.`,
      },
      scope: { movement: NON_COMMERCIAL, where: 'destination', countries: [code] },
      check: { kind: 'microchip' },
      sourceIds,
      verifiedAt: VERIFIED,
      reviewBy: REVIEW_LAW,
      dated,
      prep: ['microchip'],
    },
    {
      id: `${code.toLowerCase()}.rabies-vaccination`,
      version: 1,
      title: { sr: `Vakcina protiv besnila (${name.sr})`, en: `Rabies vaccination (${name.en})` },
      summary: {
        sr: `Prema zvaničnim pravilima koja ${name.sr} objavljuje, pas mora biti vakcinisan protiv besnila sa najmanje 12 nedelja, a od prve vakcinacije do puta mora da prođe najmanje 21 dan.`,
        en: `Under the official rules ${name.en} publishes, the dog must be vaccinated against rabies at 12 weeks of age or older, and at least 21 days must pass between the first vaccination and the trip.`,
      },
      scope: { movement: NON_COMMERCIAL, where: 'destination', countries: [code] },
      check: { kind: 'rabies-vaccination', minAgeWeeks: 12, primaryWaitDays: 21 },
      sourceIds,
      verifiedAt: VERIFIED,
      reviewBy: REVIEW_LAW,
      dated,
      prep: ['rabies-vaccination'],
    },
  ];
}

const ME_DATED: Localized = {
  sr: 'Pravila Crne Gore znamo samo iz pravilnika iz 2016. i stranice Uprave koja je arhivirana i možda nije ažurna.',
  en: 'We know Montenegro’s rules only from a 2016 rulebook and an archived page of its veterinary administration, which may be out of date.',
};
const BA_DATED: Localized = {
  sr: 'Stranica Kancelarije za veterinarstvo BiH je iz 2016, a liste zemalja iz 2023; izmenu iz 2026. nismo pronašli.',
  en: 'The page of the Office for Veterinary Affairs of Bosnia and Herzegovina dates from 2016 and its country lists from 2023; we found no 2026 update.',
};
const MK_DATED: Localized = {
  sr: 'Liste zemalja u pravilniku Severne Makedonije su iz 2019; izmenu iz 2026. nismo pronašli.',
  en: 'The country lists in North Macedonia’s rulebook date from 2019; we found no 2026 update.',
};

const RULES: RuleRecord[] = [
  // ── Entering the EU ─────────────────────────────────────────────────────
  {
    id: 'eu.microchip',
    version: 1,
    title: { sr: 'Mikročip', en: 'Microchip' },
    summary: {
      sr: 'Pas mora imati mikročip po standardu ISO 11784/11785, koji je ugradio veterinar, i to pre vakcinacije protiv besnila. Ako čip nije po tom standardu, vlasnik mora da ponese čitač. Prihvata se i čitljiva tetovaža urađena pre 3. jula 2011.',
      en: 'The dog must have a microchip to the ISO 11784/11785 standard, implanted by a vet before the rabies vaccination. If the chip is not to that standard, the owner must bring a reader. A legible tattoo applied before 3 July 2011 is also accepted.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'microchip' },
    sourceIds: ['eu-2026-131', 'ec-bringing-pet'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    prep: ['microchip'],
  },
  {
    id: 'eu.rabies-vaccination',
    version: 1,
    title: { sr: 'Vakcina protiv besnila', en: 'Rabies vaccination' },
    summary: {
      sr: 'Pas mora biti vakcinisan protiv besnila posle ugradnje čipa, a u trenutku prve vakcinacije mora imati najmanje 12 nedelja. Od završene prve vakcinacije do polaska mora da prođe najmanje 21 dan. Revakcinacija data dok prethodna vakcina još važi ne traži novo čekanje; data posle isteka računa se kao prva.',
      en: 'The dog must be vaccinated against rabies after the chip was implanted, and must be at least 12 weeks old at the first vaccination. At least 21 days must pass between the completed first vaccination and departure. A booster given while the previous vaccination is still valid needs no new wait; one given after it expired counts as a first vaccination.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'rabies-vaccination', minAgeWeeks: 12, primaryWaitDays: 21 },
    sourceIds: ['eu-2026-131', 'eu-2026-133', 'ec-bringing-pet'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    caveat: {
      sr: '21 dan se računa od završetka osnovne vakcinacije kako ju je propisao proizvođač vakcine: ako vakcina traži dve doze, od druge. Pitaj veterinara.',
      en: 'The 21 days count from the end of the primary vaccination as the vaccine’s manufacturer prescribes it: from the second dose if the vaccine needs two. Ask your vet.',
    },
    prep: ['rabies-vaccination'],
  },
  {
    id: 'eu.titre-exempt',
    version: 1,
    title: { sr: 'Test titra antitela nije potreban', en: 'No antibody titre test needed' },
    summary: {
      sr: 'Od 19. juna 2026. Srbija je na EU listi zemalja iz kojih psi ulaze bez testa titra antitela na besnilo (Sprovedbena uredba (EU) 2026/1228). Izuzetak važi i kad se putuje preko Bosne i Hercegovine, Crne Gore ili Severne Makedonije, koje su na istoj listi. Ako pas prolazi kroz zemlju koja nije na listi, uz sertifikat ide potpisana izjava da nije bio u kontaktu sa drugim životinjama.',
      en: 'Since 19 June 2026 Serbia has been on the EU list of countries whose dogs enter without a rabies antibody titre test (Implementing Regulation (EU) 2026/1228). The exemption also holds when travelling through Bosnia and Herzegovina, Montenegro or North Macedonia, which are on the same list. If the dog passes through a country that is not on the list, a signed declaration that it had no contact with other animals goes with the certificate.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'info' },
    sourceIds: ['eu-2026-1228', 'eu-2026-636', 'eu-2026-131', 'rs-vet-titre', 'rs-gov-titre'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  {
    id: 'eu.health-certificate',
    version: 1,
    title: { sr: 'EU veterinarski sertifikat', en: 'EU animal health certificate' },
    summary: {
      sr: 'Za ulazak u EU pas mora imati veterinarski sertifikat po modelu EU (Sprovedbena uredba (EU) 2026/705). U Srbiji ga izdaje nadležni veterinarski inspektor, najviše 10 dana pre ulaska u EU. Posle provere na ulazu sertifikat važi 6 meseci za putovanje kroz EU, ali ne duže od vakcine protiv besnila. Srpski pasoš za ljubimce ne zamenjuje sertifikat.',
      en: 'To enter the EU the dog needs an animal health certificate following the EU model (Implementing Regulation (EU) 2026/705). In Serbia it is issued by the competent veterinary inspector, no more than 10 days before entering the EU. After the check at the border it is valid for 6 months of travel within the EU, but not longer than the rabies vaccination. A Serbian pet passport does not replace the certificate.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'health-certificate', maxDaysBeforeEntry: 10, onwardValidityMonths: 6 },
    sourceIds: ['eu-2026-131', 'eu-2026-705', 'rs-vet-eu-faq', 'rs-vet-export-request', 'rs-vet-contacts', 'ec-pet-faq'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    howTo: {
      sr: 'Zahtev za izdavanje sertifikata predaje se veterinarskoj inspekciji (može i e-poštom, na vetinspekcija@minpolj.gov.rs). Uz zahtev idu potvrda veterinara o zdravlju psa, ne starija od 48 sati, pasoš psa i dokaz o uplati taksi. Zakonski rok za odluku je 30 dana, pa se inspekciji javi ranije i dogovori termin.',
      en: 'The application for the certificate goes to the veterinary inspection (also by email, to vetinspekcija@minpolj.gov.rs). With it go a vet’s statement of the dog’s health no older than 48 hours, the dog’s passport and proof that the fees were paid. The legal deadline for a decision is 30 days, so contact the inspection early and book an appointment.',
    },
    prep: ['vet-exam', 'health-certificate'],
  },
  {
    id: 'eu.owner-declaration',
    version: 1,
    title: { sr: 'Izjava vlasnika uz sertifikat', en: 'Owner’s declaration with the certificate' },
    summary: {
      sr: 'Uz sertifikat ide izjava koju potpisuje vlasnik (ili osoba koju je vlasnik pismeno ovlastio) da putovanje nije komercijalno. Ako sa psom putuje neko drugi, potrebno je i pismeno ovlašćenje vlasnika.',
      en: 'The certificate comes with a declaration, signed by the owner (or a person the owner has authorised in writing), that the movement is not commercial. If someone else travels with the dog, the owner’s written authorisation is needed as well.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'action' },
    sourceIds: ['eu-2026-131', 'eu-2026-705', 'ec-bringing-pet'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  {
    id: 'eu.entry-point',
    version: 1,
    title: { sr: 'Ulazak preko mesta za ljubimce', en: 'Entry through a point of entry for pets' },
    summary: {
      sr: 'Pas iz Srbije ulazi u EU preko ulaznog mesta za putnike koje je zemlja EU odredila za ljubimce. Tamo se proveravaju sertifikat i čip: po dolasku se sam javi carini ili veterinarskoj službi.',
      en: 'A dog from Serbia enters the EU through a travellers’ point of entry the EU country has designated for pets. The certificate and chip are checked there: on arrival, report to customs or the veterinary service yourself.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'entry-point', points: ENTRY_POINTS },
    sourceIds: ['eu-2016-429', 'eu-2026-131', 'ec-entry-points'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_PRACTICE,
  },
  {
    id: 'eu.max-pets',
    version: 1,
    title: { sr: 'Najviše 5 ljubimaca', en: 'No more than 5 pets' },
    summary: {
      sr: 'U nekomercijalnom kretanju može najviše 5 ljubimaca (psi, mačke i tvorovi) u jednom vozilu. Više je dozvoljeno samo za takmičenja, izložbe i sportske događaje, uz pisani dokaz o prijavi i ako su životinje starije od 6 meseci.',
      en: 'Non-commercial movement allows no more than 5 pets (dogs, cats and ferrets) per vehicle. More are allowed only for competitions, shows and sporting events, with written proof of registration and if the animals are older than 6 months.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'max-pets', max: 5 },
    sourceIds: ['eu-2016-429', 'eu-2026-131', 'ec-bringing-pet'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  {
    id: 'eu.accompaniment',
    version: 1,
    title: { sr: 'Pas putuje sa vlasnikom', en: 'The dog travels with its owner' },
    summary: {
      sr: 'Pas putuje sa vlasnikom ili sa osobom koju je vlasnik pismeno ovlastio. Ako putuje odvojeno, to mora biti najviše 5 dana pre ili posle vlasnika, koji na zahtev pokazuje dokaz o svom putovanju (na primer kartu).',
      en: 'The dog travels with its owner or with a person the owner has authorised in writing. If it travels separately, it must be no more than 5 days before or after the owner, who shows proof of their own journey (a ticket, for example) on request.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'eu-entry' },
    check: { kind: 'info' },
    sourceIds: ['eu-2016-429', 'eu-2026-131', 'youreurope-pets'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },

  // ── Serbia ──────────────────────────────────────────────────────────────
  {
    id: 'rs.pet-passport',
    version: 1,
    title: { sr: 'Pasoš za ljubimca', en: 'Pet passport' },
    summary: {
      sr: 'Po propisu Srbije pasoš za kućne ljubimce prati psa pri svakom kretanju. Izdaje ga ovlašćeni veterinar posle ugradnje čipa; u njega se upisuju čip i vakcinacije, a prilaže se i uz zahtev za sertifikat.',
      en: 'Under Serbian rules the pet passport goes with the dog whenever it travels. An authorised vet issues it after implanting the chip; the chip and vaccinations are recorded in it, and it is attached to the certificate application too.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'any' },
    check: { kind: 'pet-passport' },
    sourceIds: ['rs-pet-passport-rulebook', 'rs-vet-export-request'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  {
    id: 'rs.return-from-eu',
    version: 1,
    title: { sr: 'Povratak u Srbiju', en: 'Coming back to Serbia' },
    summary: {
      sr: 'Za ulazak psa iz zemlje EU Pravilnik (Sl. glasnik RS 20/2019) traži čip, važeću vakcinu protiv besnila i pasoš koji je izdao ovlašćeni veterinar; sertifikat i test titra nisu potrebni, a dokumenta proverava carina. Pravilnik ne kaže posebno kako se primenjuje na psa iz Srbije koji se vraća kući: to potvrdi sa Upravom za veterinu.',
      en: 'For a dog entering from an EU country, the Rulebook (Official Gazette of Serbia 20/2019) requires a chip, a valid rabies vaccination and a passport issued by an authorised vet; no certificate or titre test is needed, and customs checks the documents. The Rulebook does not say how it applies to a Serbian dog coming home: confirm that with the Veterinary Directorate.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'return-home', countries: ['HR', 'HU', 'RO', 'BG', 'GR', 'SI', 'AT', 'DE', 'IT'] },
    check: { kind: 'verify' },
    sourceIds: ['rs-pets-entry-rulebook', 'rs-pets-from-eu'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  {
    id: 'rs.return-from-me',
    version: 1,
    title: { sr: 'Povratak u Srbiju iz Crne Gore', en: 'Coming back to Serbia from Montenegro' },
    summary: {
      sr: 'Crne Gore nema ni na jednoj listi zemalja u objavljenom tekstu Pravilnika (Sl. glasnik RS 20/2019). Doslovno čitano, za ulazak psa iz Crne Gore traže se veterinarski sertifikat i test titra antitela. Pre puta to obavezno potvrdi sa Upravom za veterinu.',
      en: 'Montenegro is on none of the country lists in the published text of the Rulebook (Official Gazette of Serbia 20/2019). Read literally, a dog entering from Montenegro needs an animal health certificate and an antibody titre test. Be sure to confirm this with the Veterinary Directorate before the trip.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'return-home', countries: ['ME'] },
    check: { kind: 'verify' },
    sourceIds: ['rs-pets-entry-rulebook'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  {
    id: 'rs.return-from-ba-mk',
    version: 1,
    title: { sr: 'Povratak u Srbiju', en: 'Coming back to Serbia' },
    summary: {
      sr: 'Bosna i Hercegovina i Severna Makedonija su na listi 2 Pravilnika (Sl. glasnik RS 20/2019), za koju važe posebni uslovi ulaska. Proveri ih sa Upravom za veterinu pre puta.',
      en: 'Bosnia and Herzegovina and North Macedonia are on list 2 of the Rulebook (Official Gazette of Serbia 20/2019), which has its own entry conditions. Check them with the Veterinary Directorate before the trip.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'return-home', countries: ['BA', 'MK'] },
    check: { kind: 'verify' },
    sourceIds: ['rs-pets-entry-rulebook'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },

  // ── Breed rules on the route ────────────────────────────────────────────
  {
    id: 'de.restricted-breeds',
    version: 1,
    title: { sr: 'Nemačka: ograničene rase', en: 'Germany: restricted breeds' },
    summary: {
      sr: 'U Nemačku je zabranjeno unošenje pit bul terijera, američkih stafordširskih terijera, stafordširskih bul terijera, bul terijera i njihovih mešanaca. Turisti smeju privremeno, najviše 4 nedelje, ako pratilac ne živi u Nemačkoj, uz originale dokumenata (na primer rodovnik, potvrdu o vakcinaciji ili test ponašanja). Neke savezne pokrajine imaju i duže liste rasa.',
      en: 'Germany bans bringing in pit bull terriers, American Staffordshire terriers, Staffordshire bull terriers, bull terriers and their crosses. Visitors may bring one temporarily, for up to 4 weeks, if the person with the dog does not live in Germany, with the original documents (a pedigree, a vaccination record or a temperament test, for example). Some federal states have longer breed lists.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'route', countries: ['DE'] },
    check: { kind: 'breed-restriction', country: 'DE', maxStayDays: 28, allowedIfFciRegistered: false },
    sourceIds: ['de-hundverbreinfg', 'de-hundverbreinfvo', 'de-zoll-dangerous-dogs'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    caveat: {
      sr: 'Za duži boravak može se tražiti produženje. Pokrajinske liste rasa na stranici carine su iz 2019.',
      en: 'An extension can be requested for a longer stay. The state breed lists on the customs page date from 2019.',
    },
  },
  {
    id: 'hr.restricted-breeds',
    version: 1,
    title: { sr: 'Hrvatska: psi bul terijerskog tipa', en: 'Croatia: bull terrier type dogs' },
    summary: {
      sr: 'U Hrvatsku nije dozvoljeno unositi, provoziti niti privremeno boraviti sa psima bul terijerskog tipa (na primer pit bul terijer) koji nisu upisani u registar Međunarodnog kinološkog saveza (FCI), ni sa njihovim mešancima. Zabrana važi i za tranzit.',
      en: 'Bull terrier type dogs (a pit bull terrier, for example) that are not registered with the Fédération Cynologique Internationale (FCI), and their crosses, may not be brought into, driven through or kept temporarily in Croatia. The ban applies to transit too.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'route', countries: ['HR'] },
    check: { kind: 'breed-restriction', country: 'HR', maxStayDays: null, allowedIfFciRegistered: true },
    sourceIds: ['hr-dangerous-dogs', 'hr-gov-pets'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    caveat: {
      sr: 'Pravilnik je iz 2008; kasnije izmene nismo proverili. Ministarstvo spoljnih poslova Hrvatske isto pravilo opisuje nešto drugačije.',
      en: 'The rulebook dates from 2008; we have not checked later amendments. Croatia’s Ministry of Foreign Affairs describes the same rule somewhat differently.',
    },
  },
  {
    id: 'hr.muzzle-breeds',
    version: 1,
    title: { sr: 'Hrvatska: povodac i brnjica za neke rase', en: 'Croatia: lead and muzzle for some breeds' },
    summary: {
      sr: 'Na javnim mestima u Hrvatskoj psi sa liste rasa moraju uvek biti na povocu i sa brnjicom: doberman, američki stafordširski terijer, bul terijer, pit bul terijer, rotvajler, doga, nemački i belgijski ovčar, japanski borbeni psi, veliki japanski špic, mastifi, ilirski ovčar i njihovi mešanci.',
      en: 'In public places in Croatia, dogs of the listed breeds must always be on a lead and muzzled: Dobermanns, American Staffordshire terriers, bull terriers, pit bull terriers, Rottweilers, Great Danes, German and Belgian shepherds, Japanese fighting dogs, large Japanese spitzes, mastiffs, Illyrian shepherd dogs and their crosses.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'destination', countries: ['HR'] },
    check: { kind: 'info' },
    sourceIds: ['hr-mvep-pets'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },

  // ── Carriers ────────────────────────────────────────────────────────────
  {
    id: 'carrier.plane',
    version: 1,
    title: { sr: 'Pravila avio-prevoznika', en: 'Airline rules' },
    summary: {
      sr: 'Prevoznik odlučuje da li i kako pas leti. Air Serbia prevozi pse starije od 12 nedelja samo u kabini: pas i transporter zajedno do 8 kg, transporter do 40 × 30 × 24 cm, jedan transporter po putniku. Prevoz psa mora da potvrdi Air Serbia pre puta (prijava preko kontakt centra ili poslovnice), a čekiranje je samo na aerodromu. Prevoz u prtljažnom prostoru Air Serbia ne objavljuje. Wizz Air i Ryanair ne prevoze kućne ljubimce, osim pasa vodiča i asistenata.',
      en: 'The airline decides whether and how the dog flies. Air Serbia carries dogs older than 12 weeks in the cabin only: dog and carrier together up to 8 kg, carrier up to 40 × 30 × 24 cm, one carrier per passenger. Air Serbia must confirm the dog before the trip (book it through the contact centre or a sales office), and check-in is at the airport only. Air Serbia publishes no option for the hold. Wizz Air and Ryanair carry no pets, except guide and assistance dogs.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'any', transport: ['plane'] },
    check: { kind: 'air-cabin', maxKg: 8, minAgeWeeks: 12 },
    sourceIds: ['airserbia-pets', 'wizzair-special-baggage', 'ryanair-animals'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_PRACTICE,
  },
  {
    id: 'carrier.bus',
    version: 1,
    title: { sr: 'Pravila autobuskog prevoznika', en: 'Coach operator rules' },
    summary: {
      sr: 'Niš-Ekspres u opštim uslovima navodi da prevoz životinja u autobusima nije dozvoljen. Za druge prevoznike nismo našli objavljena pravila: pitaj prevoznika pre kupovine karte.',
      en: 'Niš-Ekspres states in its general terms that animals are not allowed on its coaches. We found no published rules for other operators: ask the operator before buying a ticket.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'any', transport: ['bus'] },
    check: { kind: 'verify' },
    sourceIds: ['nis-ekspres-terms'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_PRACTICE,
  },
  {
    id: 'carrier.train',
    version: 1,
    title: { sr: 'Pravila železničkog prevoznika', en: 'Rail operator rules' },
    summary: {
      sr: 'Srbijavoz prima pse u vozu uz brnjicu i kratak povodac, uz kartu od 50% cene karte drugog razreda; male ljubimce u transporteru vozi besplatno. Dva dokumenta Srbijavoza se razlikuju oko velikih pasa, pa to proveri pre puta. U međunarodnim vozovima kroz Mađarsku (MÁV) pas mora biti na povocu i sa brnjicom ili u transporteru, sa potvrdom o vakcinaciji ne starijom od godinu dana; najviše dva psa po odraslom putniku.',
      en: 'Srbijavoz takes dogs on its trains muzzled and on a short lead, with a ticket at 50% of the second-class fare; small pets in a carrier travel free. Two Srbijavoz documents disagree about large dogs, so check before the trip. On international trains through Hungary (MÁV) a dog must be on a lead and muzzled or in a carrier, with a vaccination record no older than one year; at most two dogs per adult passenger.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'any', transport: ['train'] },
    check: { kind: 'verify' },
    sourceIds: ['srbijavoz-pets', 'srbijavoz-terms', 'mav-international'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_PRACTICE,
  },

  // ── Neighbours outside the EU (older official sources) ──────────────────
  {
    id: 'mk.entry',
    version: 1,
    title: { sr: 'Severna Makedonija: ulazak i tranzit', en: 'North Macedonia: entry and transit' },
    summary: {
      sr: 'Prema pravilniku Severne Makedonije (2015, izmene 2019. i 2021), Srbija nije na listi zemalja bez testa, pa psu iz Srbije i za tranzit trebaju: čip, vakcina protiv besnila, test titra antitela (najmanje 0,5 IJ/ml, u laboratoriji koju priznaje EU), veterinarski sertifikat koji važi 10 dana, izjava vlasnika i ulazak preko graničnog prelaza za putnike; najviše 5 ljubimaca. Tranzit podleže istim uslovima kao uvoz, a dokumenta proverava carina.',
      en: 'Under North Macedonia’s rulebook (2015, amended 2019 and 2021), Serbia is not on the list of countries exempt from the test, so a dog from Serbia needs, even in transit: a chip, a rabies vaccination, an antibody titre test (at least 0.5 IU/ml, in an EU-approved laboratory), an animal health certificate valid for 10 days, an owner’s declaration and entry through a border crossing for travellers; no more than 5 pets. Transit is subject to the same conditions as import, and customs checks the documents.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'route', countries: ['MK'] },
    check: { kind: 'verify' },
    sourceIds: ['mk-pets'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    dated: MK_DATED,
    prep: ['vet-exam', 'health-certificate'],
  },
  {
    id: 'mk.titre-test',
    version: 1,
    title: { sr: 'Test titra antitela (Severna Makedonija)', en: 'Antibody titre test (North Macedonia)' },
    summary: {
      sr: 'Uzorak krvi za test titra uzima se najmanje 30 dana posle vakcinacije protiv besnila, a najmanje 3 meseca pre puta.',
      en: 'The blood sample for the titre test is taken at least 30 days after the rabies vaccination and at least 3 months before the trip.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'route', countries: ['MK'] },
    check: { kind: 'titre-test', minDaysAfterVaccination: 30, minMonthsBeforeTravel: 3 },
    sourceIds: ['mk-pets'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    dated: MK_DATED,
    prep: ['titre-test'],
  },
  {
    id: 'me.entry',
    version: 1,
    title: { sr: 'Crna Gora: ulazak', en: 'Montenegro: entry' },
    summary: {
      sr: 'Pravilnik Crne Gore iz 2016. traži: čip, pasoš, vakcinu protiv besnila (sa više od 12 nedelja, 21 dan posle prve vakcinacije), test titra antitela, tretman protiv ehinokoka i veterinarski sertifikat koji izdaje službeni veterinar zemlje iz koje pas dolazi; najviše 5 ljubimaca.',
      en: 'Montenegro’s 2016 rulebook requires: a chip, a passport, a rabies vaccination (given at over 12 weeks of age, 21 days after the first vaccination), an antibody titre test, a treatment against Echinococcus (tapeworm) and an animal health certificate issued by an official vet of the country the dog comes from; no more than 5 pets.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'route', countries: ['ME'] },
    check: { kind: 'verify' },
    sourceIds: ['me-pets-2020', 'me-pets-rulebook-2016'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    dated: ME_DATED,
    prep: ['vet-exam', 'health-certificate'],
  },
  {
    id: 'me.titre-test',
    version: 1,
    title: { sr: 'Test titra antitela (Crna Gora)', en: 'Antibody titre test (Montenegro)' },
    summary: {
      sr: 'Test titra radi se 30 dana posle vakcinacije protiv besnila, a najmanje 3 meseca pre puta.',
      en: 'The titre test is done 30 days after the rabies vaccination and at least 3 months before the trip.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'destination', countries: ['ME'] },
    check: { kind: 'titre-test', minDaysAfterVaccination: 30, minMonthsBeforeTravel: 3 },
    sourceIds: ['me-pets-rulebook-2016'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    dated: ME_DATED,
    prep: ['titre-test'],
  },
  {
    id: 'ba.entry',
    version: 1,
    title: { sr: 'Bosna i Hercegovina: ulazak', en: 'Bosnia and Herzegovina: entry' },
    summary: {
      sr: 'Srbija nije na listama zemalja u prilogu propisa BiH, pa za psa iz Srbije važi: čip, vakcina protiv besnila (najmanje 12 nedelja, 21 dan posle prve vakcinacije), test titra antitela (najmanje 0,5 IJ/ml), veterinarski sertifikat službenog veterinara koji važi 10 dana i ulazak preko određenog graničnog mesta; više od 5 životinja ide kao uvoz.',
      en: 'Serbia is not on the country lists annexed to the rules of Bosnia and Herzegovina, so a dog from Serbia needs: a chip, a rabies vaccination (at 12 weeks of age or older, 21 days after the first vaccination), an antibody titre test (at least 0.5 IU/ml), an animal health certificate from an official vet valid for 10 days, and entry through a designated border point; more than 5 animals count as an import.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'destination', countries: ['BA'] },
    check: { kind: 'verify' },
    sourceIds: ['ba-pets-2016'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    dated: BA_DATED,
    prep: ['vet-exam', 'health-certificate'],
  },
  {
    id: 'ba.titre-test',
    version: 1,
    title: { sr: 'Test titra antitela (BiH)', en: 'Antibody titre test (Bosnia and Herzegovina)' },
    summary: {
      sr: 'Uzorak krvi uzima se najmanje 30 dana posle vakcinacije protiv besnila, a najmanje 3 meseca pre puta.',
      en: 'The blood sample is taken at least 30 days after the rabies vaccination and at least 3 months before the trip.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'destination', countries: ['BA'] },
    check: { kind: 'titre-test', minDaysAfterVaccination: 30, minMonthsBeforeTravel: 3 },
    sourceIds: ['ba-pets-2016'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
    dated: BA_DATED,
    prep: ['titre-test'],
  },
  {
    id: 'ba.transit',
    version: 1,
    title: { sr: 'Tranzit kroz Bosnu i Hercegovinu', en: 'Transit through Bosnia and Herzegovina' },
    summary: {
      sr: 'Zvanična stranica BiH opisuje samo ulazak, pa uslove za tranzit proveri kod Kancelarije za veterinarstvo BiH. Za kratak prolaz kroz Neum hrvatska carina navodi da putnici mogu da prevezu do 5 ljubimaca koji imaju čip i dokumenta kojima se dokazuje da su kućni ljubimci.',
      en: 'The official page of Bosnia and Herzegovina describes entry only, so check the transit conditions with its Office for Veterinary Affairs. For the short stretch through Neum, Croatian customs states that travellers may carry up to 5 pets that have a chip and documents showing they are pets.',
    },
    scope: { movement: NON_COMMERCIAL, where: 'transit', countries: ['BA'] },
    check: { kind: 'verify' },
    sourceIds: ['ba-pets-2016', 'hr-customs-neum'],
    verifiedAt: VERIFIED,
    reviewBy: REVIEW_LAW,
  },
  ...nonEuDogRules('ME', { sr: 'Crna Gora', en: 'Montenegro' }, ['me-pets-rulebook-2016'], ME_DATED),
  ...nonEuDogRules('BA', { sr: 'BiH', en: 'Bosnia and Herzegovina' }, ['ba-pets-2016'], BA_DATED),
  ...nonEuDogRules('MK', { sr: 'Severna Makedonija', en: 'North Macedonia' }, ['mk-pets'], MK_DATED),
];

export const RULESET: Ruleset = {
  version: '2026-10-23.1',
  origin: 'RS',
  sources: SOURCES,
  rules: RULES,
  coverage: {
    HR: {
      level: 'full',
      note: {
        sr: 'Za Hrvatsku su provereni EU uslovi, ulazna mesta za ljubimce (spisak iz 2025) i hrvatska pravila za pse bul terijerskog tipa.',
        en: 'For Croatia we checked the EU conditions, the points of entry for pets (2025 list) and Croatia’s rules on bull terrier type dogs.',
      },
    },
    HU: {
      level: 'partial',
      note: {
        sr: 'EU uslovi su provereni. Spisak ulaznih mesta za ljubimce koji objavljuje Evropska komisija je iz 2017.',
        en: 'The EU conditions are checked. The list of points of entry for pets that the European Commission publishes dates from 2017.',
      },
    },
    RO: {
      level: 'partial',
      note: {
        sr: 'EU uslovi su provereni. Spisak ulaznih mesta za ljubimce nema datum i poziva se na propis koji više ne važi.',
        en: 'The EU conditions are checked. The list of points of entry for pets is undated and refers to a regulation that no longer applies.',
      },
    },
    BG: {
      level: 'partial',
      note: {
        sr: 'EU uslovi su provereni. Spisak ulaznih mesta za ljubimce je iz 2009.',
        en: 'The EU conditions are checked. The list of points of entry for pets dates from 2009.',
      },
    },
    GR: {
      level: 'partial',
      note: {
        sr: 'EU uslovi su provereni, ali spisak ulaznih mesta za ljubimce je iz 2006, a put kolima vodi kroz Severnu Makedoniju, čija pravila znamo iz starijih izvora.',
        en: 'The EU conditions are checked, but the list of points of entry for pets dates from 2006, and the drive goes through North Macedonia, whose rules we know only from older sources.',
      },
    },
    SI: {
      level: 'full',
      note: {
        sr: 'EU uslovi su provereni; na stranici slovenačke vlade nema posebnih pravila za rase. Kolima u Sloveniju ulaziš preko Hrvatske ili Mađarske.',
        en: 'The EU conditions are checked; the Slovenian government’s page has no breed rules of its own. By car you reach Slovenia through Croatia or Hungary.',
      },
    },
    AT: {
      level: 'full',
      note: {
        sr: 'EU uslovi su provereni. Savezna zabrana rasa nije pronađena, ali pokrajine imaju svoja pravila o držanju pasa (na primer Beč).',
        en: 'The EU conditions are checked. We found no federal breed ban, but the federal states have their own dog-keeping rules (Vienna, for example).',
      },
    },
    DE: {
      level: 'full',
      note: {
        sr: 'Provereni su EU uslovi i nemačka zabrana unosa četiri rase.',
        en: 'We checked the EU conditions and Germany’s ban on bringing in four breeds.',
      },
    },
    IT: {
      level: 'full',
      note: {
        sr: 'EU uslovi su provereni; na stranici italijanskog ministarstva zdravlja nema posebnih pravila za rase.',
        en: 'The EU conditions are checked; the Italian Ministry of Health’s page has no breed rules of its own.',
      },
    },
    ME: { level: 'partial', note: ME_DATED },
    BA: { level: 'partial', note: BA_DATED },
    MK: { level: 'partial', note: MK_DATED },
  },
};
