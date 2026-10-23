import type { SourceRecord } from './rule.models';

/**
 * Every page a rule or price cites. Each one was opened on `checkedAt` and its
 * text compared with the records that point to it (rules/ruleset.ts,
 * rules/prices.ts). EU acts link to their ELI, the permanent address that
 * resolves to the Official Journal text on EUR-Lex.
 *
 * Titles and publishers are in both languages; a plain string is a page's own
 * title (German law, an English page) that reads the same for everyone.
 *
 * Adding a source: open the page, compare it with the record, set
 * `checkedAt` to that day. Never add a source that was not opened.
 */
const CHECKED = '2026-10-23';

const OJ = { sr: 'Službeni list Evropske unije', en: 'Official Journal of the European Union' };
const COMMISSION = { sr: 'Evropska komisija', en: 'European Commission' };
const RS_VET = { sr: 'Uprava za veterinu, Ministarstvo poljoprivrede', en: 'Veterinary Directorate, Ministry of Agriculture (Serbia)' };
const HR_GAZETTE = { sr: 'Narodne novine (Republika Hrvatska)', en: 'Narodne novine, official gazette of Croatia' };
const HR_CUSTOMS = { sr: 'Carinska uprava Republike Hrvatske', en: 'Customs Administration of Croatia' };
const DE_JUSTICE = {
  sr: 'Savezno ministarstvo pravde Nemačke (gesetze-im-internet.de)',
  en: 'Federal Ministry of Justice, Germany (gesetze-im-internet.de)',
};

export const SOURCES: readonly SourceRecord[] = [
  // ── EU law ──────────────────────────────────────────────────────────────
  {
    id: 'eu-2016-429',
    title: {
      sr: 'Uredba (EU) 2016/429 o zdravlju životinja, čl. 245–246 i 249',
      en: 'Regulation (EU) 2016/429 on animal health, Articles 245–246 and 249',
    },
    publisher: OJ,
    url: 'http://data.europa.eu/eli/reg/2016/429/oj',
    kind: 'eu-law',
    checkedAt: CHECKED,
  },
  {
    id: 'eu-2026-131',
    title: {
      sr: 'Delegirana uredba (EU) 2026/131 o nekomercijalnom kretanju kućnih ljubimaca (primena od 22. 4. 2026)',
      en: 'Delegated Regulation (EU) 2026/131 on the non-commercial movement of pet animals (applies from 22 April 2026)',
    },
    publisher: OJ,
    url: 'http://data.europa.eu/eli/reg_del/2026/131/oj',
    kind: 'eu-law',
    checkedAt: CHECKED,
  },
  {
    id: 'eu-2026-133',
    title: {
      sr: 'Delegirana uredba (EU) 2026/133: uslovi vakcinacije protiv besnila (Aneks VII Uredbe 2020/688)',
      en: 'Delegated Regulation (EU) 2026/133: rabies vaccination requirements (Annex VII to Regulation 2020/688)',
    },
    publisher: OJ,
    url: 'http://data.europa.eu/eli/reg_del/2026/133/oj',
    kind: 'eu-law',
    checkedAt: CHECKED,
  },
  {
    id: 'eu-2026-636',
    title: {
      sr: 'Sprovedbena uredba (EU) 2026/636: liste trećih zemalja',
      en: 'Implementing Regulation (EU) 2026/636: lists of third countries',
    },
    publisher: OJ,
    url: 'http://data.europa.eu/eli/reg_impl/2026/636/oj',
    kind: 'eu-law',
    checkedAt: CHECKED,
  },
  {
    id: 'eu-2026-1228',
    title: {
      sr: 'Sprovedbena uredba (EU) 2026/1228: Srbija i Crna Gora na listi iz Aneksa II (od 19. 6. 2026)',
      en: 'Implementing Regulation (EU) 2026/1228: Serbia and Montenegro added to the list in Annex II (from 19 June 2026)',
    },
    publisher: OJ,
    url: 'http://data.europa.eu/eli/reg_impl/2026/1228/oj',
    kind: 'eu-law',
    checkedAt: CHECKED,
  },
  {
    id: 'eu-2026-705',
    title: {
      sr: 'Sprovedbena uredba (EU) 2026/705: modeli sertifikata i izjava',
      en: 'Implementing Regulation (EU) 2026/705: model certificates and declarations',
    },
    publisher: OJ,
    url: 'http://data.europa.eu/eli/reg_impl/2026/705/oj',
    kind: 'eu-law',
    checkedAt: CHECKED,
  },
  // ── EU guidance ─────────────────────────────────────────────────────────
  {
    id: 'ec-bringing-pet',
    title: { sr: 'Unošenje ljubimca u EU iz zemlje van EU', en: 'Bringing a pet into the EU from a non-EU country' },
    publisher: COMMISSION,
    url: 'https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/bringing-pet-eu-non-eu-country_en',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'ec-pet-faq',
    title: { sr: 'Česta pitanja o putovanju sa ljubimcem', en: 'Frequently asked questions on travelling with a pet' },
    publisher: COMMISSION,
    url: 'https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/faqs_en',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'ec-entry-points',
    title: { sr: 'Ulazna mesta za putnike sa ljubimcima, po zemljama EU', en: 'Travellers’ points of entry for pets, by EU country' },
    publisher: COMMISSION,
    url: 'https://food.ec.europa.eu/animals/live-animal-movements/dogs-cats-and-ferrets/travellers-points-entry_en',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'youreurope-pets',
    title: { sr: 'Putovanje sa životinjama (Your Europe)', en: 'Travelling with animals (Your Europe)' },
    publisher: { sr: 'Evropska unija', en: 'European Union' },
    url: 'https://europa.eu/youreurope/citizens/travel/carry/animal-plant/index_en.htm',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  // ── Serbia ──────────────────────────────────────────────────────────────
  {
    id: 'rs-vet-titre',
    title: {
      sr: 'Kretanje kućnih ljubimaca: nije potreban titar antitela na besnilo za Evropsku uniju (17. 6. 2026)',
      en: 'Pet movement: no rabies antibody titre needed for the European Union (17 June 2026)',
    },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/kretanje-kucni-ljubimci-nije-potreban-titat-antitela-na-besnilo-za-evropsku-uniju/',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-vet-eu-faq',
    title: {
      sr: 'Najčešća pitanja i odgovori: kućni ljubimci i Evropska unija',
      en: 'Frequently asked questions: pets and the European Union',
    },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/najcesca-pitanja-i-odgovori-kucni-ljubimci-evropska-unija/',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-gov-titre',
    title: {
      sr: 'Srbija na listi zemalja bez obaveznog titra antitela na besnilo (17. 6. 2026)',
      en: 'Serbia on the list of countries without a mandatory rabies antibody titre (17 June 2026)',
    },
    publisher: { sr: 'Vlada Republike Srbije', en: 'Government of the Republic of Serbia' },
    url: 'https://www.srbija.gov.rs/vest/981241/srbija-na-listi-zemalja-bez-obaveznog-titra-antitela-na-besnilo.php',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-vet-export-request',
    title: {
      sr: 'Zahtev za izdavanje sertifikata za izvoz živih životinja (obrazac, avgust 2025)',
      en: 'Application for a certificate for the export of live animals (form, August 2025, in Serbian)',
    },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/storage/2025/08/Zahtev-za-izdavanje-sertifikata-za-izvoz-zivih-zivotinja.pdf',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-vet-contacts',
    title: { sr: 'Kontakt: okružne veterinarske inspekcije', en: 'Contacts: district veterinary inspection offices' },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/kontakt/',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-pets-entry-rulebook',
    title: {
      sr: 'Pravilnik o uslovima za nekomercijalno kretanje kućnih ljubimaca (Sl. glasnik RS 20/2019)',
      en: 'Rulebook on the conditions for the non-commercial movement of pets (Official Gazette of Serbia 20/2019)',
    },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/legislativa/pravilnici/uvoz%20i%20tranzit.pdf',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-pets-from-eu',
    title: {
      sr: 'Uslovi za nekomercijalno kretanje kućnih ljubimaca (unos) iz zemalja EU',
      en: 'Conditions for bringing pets into Serbia from EU countries (non-commercial movement)',
    },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/kretanje-kucnih-ljubimaca/',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-pet-passport-rulebook',
    title: {
      sr: 'Pravilnik o načinu obeležavanja i registracije pasa i mačaka (Sl. glasnik RS 23/12)',
      en: 'Rulebook on the marking and registration of dogs and cats (Official Gazette of Serbia 23/12)',
    },
    publisher: RS_VET,
    url: 'https://www.vet.minpolj.gov.rs/legislativa/pravilnici/Pravilnik%20o%20nacinu%20obelezavanja%20i%20registracije%20pasa%20i%20macaka.pdf',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  // ── Neighbours outside the EU ───────────────────────────────────────────
  {
    id: 'me-pets-2020',
    title: {
      sr: 'Nekomercijalno kretanje kućnih ljubimaca (objavljeno 4. 3. 2020, arhivirano)',
      en: 'Non-commercial movement of pets (published 4 March 2020, archived)',
    },
    publisher: {
      sr: 'Uprava za bezbjednost hrane, veterinu i fitosanitarne poslove (Crna Gora)',
      en: 'Administration for Food Safety, Veterinary and Phytosanitary Affairs (Montenegro)',
    },
    url: 'https://www.gov.me/clanak/222356--nekomercijalno-kretanje-kucnih-ljubimaca',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'me-pets-rulebook-2016',
    title: {
      sr: 'Pravilnik o uslovima za nekomercijalno kretanje kućnih ljubimaca (Sl. list CG 42/2016)',
      en: 'Rulebook on the conditions for the non-commercial movement of pets (Official Gazette of Montenegro 42/2016)',
    },
    publisher: { sr: 'Vlada Crne Gore', en: 'Government of Montenegro' },
    url: 'https://wapi.gov.me/download/d0d5a181-a0af-4c86-ba3a-b16e5007803d?version=1.0',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'ba-pets-2016',
    title: {
      sr: 'Pets non commercial movement to Bosnia and Herzegovina (11. 4. 2016)',
      en: 'Pets non commercial movement to Bosnia and Herzegovina (11 April 2016)',
    },
    publisher: {
      sr: 'Kancelarija za veterinarstvo Bosne i Hercegovine',
      en: 'Office for Veterinary Affairs of Bosnia and Herzegovina',
    },
    url: 'https://vet.gov.ba/en/document/d346',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'mk-pets',
    title: { sr: 'Домашни миленици: uvoz i tranzit', en: 'Домашни миленици (pets): import and transit' },
    publisher: {
      sr: 'Agencija za hranu i veterinarstvo Severne Makedonije',
      en: 'Food and Veterinary Agency of North Macedonia',
    },
    url: 'https://fva.gov.mk/mk/domasni-milenici',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-customs-neum',
    title: { sr: 'Prolaz kroz Neum: ljubimci putnika', en: 'Passing through Neum: travellers’ pets' },
    publisher: HR_CUSTOMS,
    url: 'https://carina.gov.hr/default.aspx?id=6707',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  // ── Croatia ─────────────────────────────────────────────────────────────
  {
    id: 'hr-entry-points-2023',
    title: {
      sr: 'Pravilnik o određivanju ulaznih točaka za nekomercijalno premještanje kućnih ljubimaca (NN 53/2023)',
      en: 'Rulebook designating the points of entry for the non-commercial movement of pets (NN 53/2023)',
    },
    publisher: HR_GAZETTE,
    url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2023_05_53_928.html',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-entry-points-2025',
    title: {
      sr: 'Izmena spiska drumskih ulaznih točaka (NN 80/2025, na snazi od 24. 5. 2025)',
      en: 'Amended list of road points of entry (NN 80/2025, in force from 24 May 2025)',
    },
    publisher: HR_GAZETTE,
    url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2025_05_80_1063.html',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-customs-pets',
    title: { sr: 'Prekogranično kretanje kućnih ljubimaca', en: 'Cross-border movement of pets' },
    publisher: HR_CUSTOMS,
    url: 'https://carina.gov.hr/pristup-informacijama/propisi-i-sporazumi/carinsko-postupanje/fizicke-osobe-2715/prekogranicno-kretanje-kucnih-ljubimaca/2744',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-dangerous-dogs',
    title: { sr: 'Pravilnik o opasnim psima (NN 117/2008), čl. 11', en: 'Rulebook on dangerous dogs (NN 117/2008), Article 11' },
    publisher: HR_GAZETTE,
    url: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2008_10_117_3386.html',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-gov-pets',
    title: 'Movement of pets',
    publisher: { sr: 'gov.hr (Vlada Republike Hrvatske)', en: 'gov.hr (Government of Croatia)' },
    url: 'https://www.gov.hr/en/movement-of-pets/1996',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-mvep-pets',
    title: 'Non-commercial movement of pets',
    publisher: {
      sr: 'Ministarstvo vanjskih i europskih poslova Republike Hrvatske',
      en: 'Ministry of Foreign and European Affairs of Croatia',
    },
    url: 'https://mvep.gov.hr/consular-information-140779/non-commercial-movement-of-pets/140781',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  // ── Entry-point lists the Commission hosts ──────────────────────────────
  {
    id: 'hu-entry-points-2017',
    title: { sr: 'Mađarska: ulazna mesta za kućne ljubimce (spisak iz 2017)', en: 'Hungary: points of entry for pets (2017 list)' },
    publisher: { sr: 'Evropska komisija (spisak Mađarske)', en: 'European Commission (Hungary’s list)' },
    url: 'https://food.ec.europa.eu/document/download/b875066f-7857-4e82-8b9d-1dedb9d01ae9_en?filename=pm_non-com_entry_hun_2017.pdf',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'ro-entry-points',
    title: {
      sr: 'Rumunija: ulazna mesta za kućne ljubimce (spisak bez datuma, po Uredbi 576/2013)',
      en: 'Romania: points of entry for pets (undated list, under Regulation 576/2013)',
    },
    publisher: { sr: 'Evropska komisija (spisak ANSVSA)', en: 'European Commission (ANSVSA’s list)' },
    url: 'https://food.ec.europa.eu/document/download/17513bfb-457c-479e-97b8-53b407f7fbc3_en?filename=pm_non-com_entry_rou.pdf',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'bg-entry-points-2009',
    title: { sr: 'Bugarska: ulazna mesta za kućne ljubimce (spisak iz 2009)', en: 'Bulgaria: points of entry for pets (2009 list)' },
    publisher: { sr: 'Evropska komisija (spisak Bugarske)', en: 'European Commission (Bulgaria’s list)' },
    url: 'https://food.ec.europa.eu/document/download/6340c268-c84d-464e-9e98-c9ff2c5c3d16_en?filename=pm_non-com_entry_bgr.pdf',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'gr-entry-points-2006',
    title: { sr: 'Grčka: ulazna mesta za kućne ljubimce (spisak iz 2006)', en: 'Greece: points of entry for pets (2006 list)' },
    publisher: { sr: 'Evropska komisija (spisak Grčke)', en: 'European Commission (Greece’s list)' },
    url: 'https://food.ec.europa.eu/document/download/21509df0-2f35-409a-b93c-0049f5e2ab72_en?filename=pm_non-com_entry_grc.pdf',
    kind: 'eu-guidance',
    checkedAt: CHECKED,
  },
  {
    id: 'at-bmf-pets-2026',
    title: {
      sr: 'Veterinärbestimmungen für Heimtiere (stanje 20. 5. 2026)',
      en: 'Veterinärbestimmungen für Heimtiere (as of 20 May 2026)',
    },
    publisher: { sr: 'Ministarstvo finansija Austrije (BMF)', en: 'Federal Ministry of Finance, Austria (BMF)' },
    url: 'https://www.bmf.gv.at/dam/jcr:4ef53e25-690b-46dc-848f-0497b8deb35c/2026%2006%2019%20Veterin%C3%A4rbestimmungen%20Heimtiere.pdf',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  // ── Germany ─────────────────────────────────────────────────────────────
  {
    id: 'de-hundverbreinfg',
    title: 'Hundeverbringungs- und -einfuhrbeschränkungsgesetz, § 2',
    publisher: DE_JUSTICE,
    url: 'https://www.gesetze-im-internet.de/hundverbreinfg/__2.html',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'de-hundverbreinfvo',
    title: {
      sr: 'Hundeverbringungs- und -einfuhrverordnung, § 2 (izuzetak do četiri nedelje)',
      en: 'Hundeverbringungs- und -einfuhrverordnung, § 2 (exception for up to four weeks)',
    },
    publisher: DE_JUSTICE,
    url: 'https://www.gesetze-im-internet.de/hundverbreinfvo/__2.html',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  {
    id: 'de-zoll-dangerous-dogs',
    title: 'Dangerous dogs',
    publisher: { sr: 'Carina Nemačke (Zoll)', en: 'German Customs (Zoll)' },
    url: 'https://www.zoll.de/EN/Private-individuals/Travel/Entering-Germany/Restrictions/Dangerous-dogs/dangerous-dogs.html',
    kind: 'national-authority',
    checkedAt: CHECKED,
  },
  // ── Carriers ────────────────────────────────────────────────────────────
  {
    id: 'airserbia-pets',
    title: { sr: 'Putovanje sa kućnim ljubimcima', en: 'Travelling with pets (in Serbian)' },
    publisher: 'Air Serbia',
    url: 'https://blog.airserbia.com/sr_latin/info-and-help/travel-guidelines/traveling-with-your-pets',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  {
    id: 'wizzair-special-baggage',
    title: 'Special baggage',
    publisher: 'Wizz Air',
    url: 'https://www.wizzair.com/en-gb/help-centre/booking-information-and-services/baggage/special-baggage',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  {
    id: 'ryanair-animals',
    title: 'Does Ryanair carry animals?',
    publisher: 'Ryanair',
    url: 'https://help.ryanair.com/hc/en-gb/articles/12890968181521-Does-Ryanair-carry-animals',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  {
    id: 'srbijavoz-pets',
    title: { sr: 'Prevoz ljubimaca', en: 'Carrying pets (in Serbian)' },
    publisher: 'Srbijavoz',
    url: 'https://srbijavoz.rs/prevoz-ljubimaca/',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  {
    id: 'srbijavoz-terms',
    title: { sr: 'Opšti uslovi: prevoz pripitomljenih životinja', en: 'General terms: carriage of domestic animals (in Serbian)' },
    publisher: 'Srbijavoz',
    url: 'https://srbijavoz.rs/opsti-uslovi/',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  {
    id: 'mav-international',
    title: {
      sr: 'Special conditions of MÁV for international rail travel (od 14. 12. 2025), tačka 18',
      en: 'Special conditions of MÁV for international rail travel (from 14 December 2025), point 18',
    },
    publisher: { sr: 'MÁV (železnice Mađarske)', en: 'MÁV (Hungarian State Railways)' },
    url: 'https://www.mavcsoport.hu/sites/default/files/upload/page/special_conditions_of_mav_-_from_14-12-2025.pdf',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  {
    id: 'nis-ekspres-terms',
    title: { sr: 'Opšti uslovi putovanja', en: 'General terms of travel (in Serbian)' },
    publisher: 'Niš-Ekspres',
    url: 'https://nis-ekspres.rs/opsti-uslovi-putovanja/',
    kind: 'transport-provider',
    checkedAt: CHECKED,
  },
  // ── Prices and rates ────────────────────────────────────────────────────
  {
    id: 'hu-evignette-rates',
    title: {
      sr: 'E-vignette rates (cenovnik od 1. 1. 2026)',
      en: 'E-vignette rates (price list from 1 January 2026)',
    },
    publisher: { sr: 'Nemzeti Útdíjfizetési Szolgáltató (Mađarska)', en: 'Nemzeti Útdíjfizetési Szolgáltató (Hungary)' },
    url: 'https://nemzetiutdij.hu/en/e-vignette/tolls/e-vignette-rates',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'si-evinjeta',
    title: { sr: 'E-vinjeta: cene i važenje', en: 'E-vignette: prices and validity' },
    publisher: { sr: 'DARS (Slovenija)', en: 'DARS (Slovenia)' },
    url: 'https://evinjeta.dars.si/en/e-vignette-validity',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'at-vignette',
    title: 'Vignette rates 2026',
    publisher: { sr: 'ASFINAG (Austrija)', en: 'ASFINAG (Austria)' },
    url: 'https://www.asfinag.at/en/toll/vignette/',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'bg-evignette',
    title: 'E-vignette prices to change from 1 August (2026)',
    publisher: { sr: 'Agencija za naplatu putarine (Bugarska)', en: 'Road Toll Agency (Bulgaria)' },
    url: 'https://www.bgtoll.bg/en/news/up-to-date-information/e-vignette-prices-to-change-from-1-august',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'ro-rovinieta',
    title: { sr: 'Rovinieta: tarife (OMTI 959/2026)', en: 'Rovinieta: rates (OMTI 959/2026)' },
    publisher: { sr: 'CNAIR (Rumunija)', en: 'CNAIR (Romania)' },
    url: 'https://portal.etoll.ro/web/guest/rovinieta',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'rs-tolls',
    title: { sr: 'Cenovnik i kalkulator putarine', en: 'Toll price list and calculator' },
    publisher: { sr: 'JP Putevi Srbije', en: 'Roads of Serbia (JP Putevi Srbije)' },
    url: 'https://www.putevi-srbije.rs/index.php/sr/kategorizacija-vozila-cenovnik-putarine',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'hr-tolls',
    title: { sr: 'Cenovnik putarine po deonicama', en: 'Toll rates by section' },
    publisher: { sr: 'Hrvatske autoceste (HAC)', en: 'Croatian Motorways (HAC)' },
    url: 'https://www.hac.hr/en/toll/toll-rates/a1',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'it-tolls',
    title: { sr: 'Kalkulator putarine', en: 'Toll calculator' },
    publisher: 'Autostrade per l’Italia',
    url: 'https://viabilita.autostrade.it/it/viabilita/pedaggio',
    kind: 'toll-operator',
    checkedAt: CHECKED,
  },
  {
    id: 'ecb-rates',
    title: { sr: 'Referentni kursevi evra (22. 10. 2026)', en: 'Euro foreign exchange reference rates (22 October 2026)' },
    publisher: { sr: 'Evropska centralna banka', en: 'European Central Bank' },
    url: 'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',
    kind: 'central-bank',
    checkedAt: CHECKED,
  },
  {
    id: 'nbs-rate',
    title: { sr: 'Zvanični srednji kurs dinara (23. 10. 2026)', en: 'Official middle exchange rate of the dinar (23 October 2026)' },
    publisher: { sr: 'Narodna banka Srbije', en: 'National Bank of Serbia' },
    url: 'https://webappcenter.nbs.rs/ExchangeRateWebApp/ExchangeRate/CurrentMiddleRate',
    kind: 'central-bank',
    checkedAt: CHECKED,
  },
];
