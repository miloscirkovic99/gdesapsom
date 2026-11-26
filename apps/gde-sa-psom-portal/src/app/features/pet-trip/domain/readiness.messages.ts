import { pluralForm } from '@gde/shared/util';
import type { CountryInfo } from './countries';
import type { Lang } from './lang';

/**
 * Every sentence the readiness check writes, in both languages. Dates arrive
 * already formatted for the language; a Serbian date ends with a full stop
 * ("12. decembra 2026."), which readiness.ts folds into the sentence's own.
 */
export interface ReadinessMessages {
  coverageEu(country: CountryInfo): string;
  coverageNone(country: CountryInfo): string;
  assumePlane: string;
  assumeRoad: string;
  commercialTitle: string;
  commercialDetail: string;
  coverageItemTitle(country: CountryInfo): string;
  coverageItemDetail(note: string): string;
  /** "Pas 2" when the trip has more than one dog. */
  dogLabel(index: number): string;
  staleRule(verifiedAt: string): string;
  unverifiedRule: string;

  microchip: {
    iso: string;
    other: string;
    unknownType: string;
    none(until: string | null): string;
  };
  rabies: {
    rules(minAgeWeeks: number, waitDays: number): string;
    noBirthDate: string;
    late(departure: string, earliest: string): string;
    window(from: string, until: string): string;
    enterDeparture: string;
    vaccinatedBeforeChip: string;
    needsChipThenVaccine: string;
    notVaccinated: string;
    askVaccinated: string;
    givenBeforeChip: string;
    enterDates: string;
    datesOutOfOrder: string;
    tooYoung(minAgeWeeks: number): string;
    enterDepartureForValidity: string;
    expiresBeforeDeparture(validUntil: string): string;
    expired(validUntil: string): string;
    firstWait(readyFrom: string, waitDays: number): string;
    maybeFirst(readyFrom: string): string;
    expiresDuringTrip(validUntil: string): string;
    chipOrderUnknown(validUntil: string): string;
    valid(validUntil: string): string;
  };
  titre: {
    rule(minDays: number, minMonths: number): string;
    needsVaccination: string;
    earliest(sampleFrom: string, travelFrom: string): string;
    late(departure: string): string;
    sampleUntil(date: string): string;
  };
  certificate: {
    enterDeparture: string;
    pastDeparture: string;
    window(maxDays: number, departure: string, from: string): string;
    onward(months: number, until: string): string;
  };
  entryPoint: {
    enterTransit: string;
    airport: string;
    rail: string;
    road: string;
    noList(country: CountryInfo): string;
    points(country: CountryInfo, kind: string, names: string): string;
    datedList(country: CountryInfo, asOf: string | null): string;
  };
  passport: { yes: string; no: string; unknown: string };
  breed: {
    notListed: string;
    askBreed: string;
    fciRegistered: string;
    askFci: string;
    bannedEntry: string;
    bannedTransit: string;
    allowedStay(maxDays: number, stayDays: number | null): string;
    tooLong(stayDays: number, maxDays: number): string;
  };
  maxPets: { ok(count: number, max: number): string; tooMany(max: number): string };
  airCabin: {
    theDog: string;
    tooHeavy(who: string, kg: number, maxKg: number): string;
    tooYoung(who: string, weeks: number): string;
    oneCarrier: string;
  };
}

const DOG_FORMS_SR = { one: 'psom', few: 'psa', many: 'pasa' } as const;

const SR: ReadinessMessages = {
  coverageEu: (country) => `Za ${country.genitive} važe opšta EU pravila; posebna pravila te zemlje nismo proverili.`,
  coverageNone: (country) => `Uslove za ulazak psa ${country.locative} nismo proverili.`,
  assumePlane: 'Računamo direktan let: ako presedaš u drugoj zemlji EU, provera dokumenata je na prvom aerodromu u EU.',
  assumeRoad: 'Računamo da u EU ulaziš na dan polaska. Ako stižeš kasnije, rokovi se pomeraju za isto toliko dana.',
  commercialTitle: 'Komercijalno kretanje nije pokriveno',
  commercialDetail:
    'Kada se pas prodaje, udomljava, menja vlasnika ili putuje bez vlasnika (ili osobe koju je vlasnik pismeno ovlastio), važe pravila za komercijalno kretanje. Ovaj alat ih ne proverava: obrati se Upravi za veterinu.',
  coverageItemTitle: (country) => `Uslovi za ulazak ${country.locative}`,
  coverageItemDetail: (note) => `${note} Pre polaska proveri uslove kod nadležne veterinarske službe te zemlje.`,
  dogLabel: (index) => `Pas ${index + 1}`,
  staleRule: (verifiedAt) =>
    `Pravilo smo poslednji put proverili ${verifiedAt}, a ta provera je zastarela: potvrdi ga u izvoru pre polaska.`,
  unverifiedRule: 'Ovo pravilo još nije potvrđeno u zvaničnom izvoru: proveri ga pre polaska.',

  microchip: {
    iso: 'Pas ima mikročip po standardu ISO 11784/11785.',
    other: 'Čip nije po standardu ISO 11784/11785: ponesi čitač koji ga očitava, da bi granična kontrola mogla da ga proveri.',
    unknownType: 'Proveri kod veterinara da li čip odgovara standardu ISO 11784/11785 (broj od 15 cifara, upisan u pasoš).',
    none: (until) =>
      until
        ? `Pas nema čip. Ugradi ga pre vakcinacije protiv besnila (može u istoj poseti), najkasnije ${until}.`
        : 'Pas nema čip. Ugradi ga pre vakcinacije protiv besnila (može u istoj poseti).',
  },
  rabies: {
    rules: (minAgeWeeks, waitDays) =>
      `Pas mora da ima čip pre vakcine i najmanje ${minAgeWeeks} nedelja kada je prima, a od prve vakcinacije do polaska mora da prođe najmanje ${waitDays} dana.`,
    noBirthDate: 'Datum rođenja nije unet, pa minimalni uzrast nismo proverili.',
    late: (departure, earliest) => `Uz polazak ${departure} to nije moguće: najraniji polazak je ${earliest}.`,
    window: (from, until) => `Vakciniši psa između ${from} i ${until}.`,
    enterDeparture: 'Unesi datum polaska da bismo izračunali rok.',
    vaccinatedBeforeChip: 'Vakcina se priznaje samo ako je data posle ugradnje čipa, pa posle čipa pas treba novu vakcinaciju.',
    needsChipThenVaccine: 'Pas treba čip, pa vakcinu protiv besnila.',
    notVaccinated: 'Pas nije vakcinisan protiv besnila.',
    askVaccinated: 'Proveri u pasošu da li je i kada pas vakcinisan protiv besnila.',
    givenBeforeChip: 'Vakcina data pre ugradnje čipa se ne priznaje.',
    enterDates: 'Unesi datum poslednje vakcinacije protiv besnila i datum do kog važi (piše u pasošu).',
    datesOutOfOrder: 'Datum važenja vakcine mora biti posle datuma vakcinacije: proveri unos.',
    tooYoung: (minAgeWeeks) => `Pas je vakcinisan pre nego što je napunio ${minAgeWeeks} nedelja, pa se ta vakcina ne priznaje.`,
    enterDepartureForValidity: 'Unesi datum polaska da bismo proverili da li vakcina važi tokom puta.',
    expiresBeforeDeparture: (validUntil) =>
      `Vakcina važi do ${validUntil}, pre polaska. Revakciniši psa najkasnije ${validUntil}: revakcinacija pre isteka ne traži novo čekanje.`,
    expired: (validUntil) => `Vakcina je istekla ${validUntil}, pa se nova vakcinacija računa kao prva.`,
    firstWait: (readyFrom, waitDays) =>
      `Ovo je prva vakcinacija, pa pas može da putuje najranije ${readyFrom} (${waitDays} dana posle vakcine). Pomeri polazak.`,
    maybeFirst: (readyFrom) =>
      `Ako je ova vakcina prva (ili je data posle isteka prethodne), pas može da putuje tek od ${readyFrom}. Proveri u pasošu da li je prethodna vakcina još važila na dan ove.`,
    expiresDuringTrip: (validUntil) =>
      `Vakcina ističe ${validUntil}, pre povratka. Revakciniši psa pre tog dana (može i u inostranstvu): revakcinacija pre isteka ne traži novo čekanje.`,
    chipOrderUnknown: (validUntil) =>
      `Vakcina važi do ${validUntil}, tokom celog puta. Proveri u pasošu da je čip ugrađen pre vakcine ili istog dana: samo tada se vakcina priznaje.`,
    valid: (validUntil) => `Vakcina važi do ${validUntil}, tokom celog puta.`,
  },
  titre: {
    rule: (minDays, minMonths) =>
      `Uzorak krvi za test titra antitela uzima se najmanje ${minDays} dana posle vakcinacije protiv besnila i najmanje ${minMonths} meseca pre puta.`,
    needsVaccination: 'Pas prvo treba važeću vakcinu protiv besnila.',
    earliest: (sampleFrom, travelFrom) => `Najraniji uzorak: ${sampleFrom}; najraniji put posle njega: ${travelFrom}.`,
    late: (departure) => `Za polazak ${departure} to ne stiže.`,
    sampleUntil: (date) => `Za tvoj polazak uzorak treba uzeti najkasnije ${date}.`,
  },
  certificate: {
    enterDeparture: 'Unesi datum polaska da bismo izračunali kada da zakažeš izdavanje sertifikata.',
    pastDeparture: 'Datum polaska je u prošlosti: izmeni ga.',
    window: (maxDays, departure, from) =>
      `Sertifikat mora biti izdat najviše ${maxDays} dana pre ulaska u EU: za polazak ${departure} najranije ${from}.`,
    onward: (months, until) =>
      `Posle ulaska sertifikat važi najviše ${months} meseci, do ${until}, a tvoj boravak traje duže: proveri šta ti treba za ostatak boravka.`,
  },
  entryPoint: {
    enterTransit: 'Navedi zemlje kroz koje prolaziš do odredišta, da bismo znali gde ulaziš u EU.',
    airport: 'Aerodrom',
    rail: 'Železnički prelaz',
    road: 'Drumski prelaz',
    noList: (country) =>
      `U EU ulaziš ${country.locative}. Za tu zemlju nemamo proveren spisak ulaznih mesta za ljubimce na ovoj ruti: proveri ga na stranici Evropske komisije pre nego što izabereš rutu.`,
    points: (country, kind, names) =>
      `U EU ulaziš ${country.locative}. ${kind} određen za ljubimce: ${names}. Na ulazu se javi carini, koja proverava sertifikat i čip.`,
    datedList: (country, asOf) =>
      `Spisak ulaznih mesta ${country.genitive} je ${asOf ? `iz ${asOf}` : 'bez datuma'} i stariji je od novih EU pravila: proveri ga pre puta.`,
  },
  passport: {
    yes: 'Pas ima pasoš. Ponesi ga na put i proveri da su u njemu čip i vakcinacije.',
    no: 'Pasoš izdaje ovlašćeni veterinar koji ugrađuje čip; ako je pasoš izgubljen, traži duplikat.',
    unknown: 'Odgovori da li pas ima pasoš za kućne ljubimce.',
  },
  breed: {
    notListed: 'Ograničenje se ne odnosi na tvog psa.',
    askBreed: 'Odgovori da li je pas neke od navedenih rasa ili njihov mešanac.',
    fciRegistered: 'Pas je upisan u registar FCI, pa zabrana za njega ne važi. Ponesi rodovnik kao dokaz.',
    askFci: 'Odgovori da li je pas upisan u registar FCI (ima rodovnik).',
    bannedEntry: 'Sa ovim psom ne smeš da uđeš u ovu zemlju, ni privremeno.',
    bannedTransit: 'Sa ovim psom ne smeš ni da prođeš kroz ovu zemlju: izaberi rutu koja je zaobilazi.',
    allowedStay: (maxDays, stayDays) =>
      `Pas sme da ostane najviše ${maxDays} dana, uz pratioca koji ne živi u toj zemlji${stayDays !== null ? ` (tvoj boravak: ${stayDays} dana)` : ''}. Ponesi originale dokumenata psa.`,
    tooLong: (stayDays, maxDays) =>
      `Boravak od ${stayDays} dana je duži od dozvoljenih ${maxDays}: produženje se traži unapred od nadležnog organa, ili skrati boravak.`,
  },
  maxPets: {
    ok: (count, max) =>
      `Putuješ sa ${count} ${DOG_FORMS_SR[pluralForm(count, 'rs')]}; dozvoljeno je najviše ${max} ljubimaca (računaju se i mačke i tvorovi).`,
    tooMany: (max) =>
      `Sa više od ${max} ljubimaca ne važe pravila za nekomercijalno putovanje, osim za takmičenja i izložbe uz pisani dokaz.`,
  },
  airCabin: {
    theDog: 'Pas',
    tooHeavy: (who, kg, maxKg) => `${who} teži ${kg} kg, pa sa transporterom prelazi ${maxKg} kg: u kabinu Air Serbia ne može.`,
    tooYoung: (who, weeks) => `${who} na dan leta neće imati ${weeks} nedelja.`,
    oneCarrier: 'Air Serbia prima jedan transporter po putniku.',
  },
};

const EN: ReadinessMessages = {
  coverageEu: (country) => `The general EU rules apply to ${country.name.en}; we have not checked that country’s own rules.`,
  coverageNone: (country) => `We have not checked the conditions for bringing a dog into ${country.name.en}.`,
  assumePlane: 'We assume a direct flight: if you change planes in another EU country, the documents are checked at the first EU airport.',
  assumeRoad: 'We assume you enter the EU on the day you leave. If you arrive later, the deadlines move by as many days.',
  commercialTitle: 'Commercial movement is not covered',
  commercialDetail:
    'When a dog is sold, rehomed, changes owner or travels without its owner (or a person the owner has authorised in writing), the rules for commercial movement apply. This tool does not check them: contact the Veterinary Directorate.',
  coverageItemTitle: (country) => `Entry conditions for ${country.name.en}`,
  coverageItemDetail: (note) => `${note} Before you leave, check the conditions with that country’s veterinary authority.`,
  dogLabel: (index) => `Dog ${index + 1}`,
  staleRule: (verifiedAt) =>
    `We last checked this rule on ${verifiedAt} and that check is out of date: confirm it in the source before you leave.`,
  unverifiedRule: 'This rule has not been confirmed in an official source yet: check it before you leave.',

  microchip: {
    iso: 'The dog has a microchip to the ISO 11784/11785 standard.',
    other: 'The chip is not to the ISO 11784/11785 standard: bring a reader that can read it, so border control can check it.',
    unknownType: 'Ask your vet whether the chip meets the ISO 11784/11785 standard (a 15-digit number, recorded in the passport).',
    none: (until) =>
      until
        ? `The dog has no chip. Have one implanted before the rabies vaccination (it can be the same visit), by ${until} at the latest.`
        : 'The dog has no chip. Have one implanted before the rabies vaccination (it can be the same visit).',
  },
  rabies: {
    rules: (minAgeWeeks, waitDays) =>
      `The dog must be chipped before the vaccination and at least ${minAgeWeeks} weeks old when it gets it, and at least ${waitDays} days must pass between the first vaccination and departure.`,
    noBirthDate: 'No date of birth was entered, so we have not checked the minimum age.',
    late: (departure, earliest) => `With a departure on ${departure} that is not possible: the earliest departure is ${earliest}.`,
    window: (from, until) => `Have the dog vaccinated between ${from} and ${until}.`,
    enterDeparture: 'Enter the departure date so we can work out the deadline.',
    vaccinatedBeforeChip: 'A vaccination counts only if it was given after the chip, so after chipping the dog needs a new vaccination.',
    needsChipThenVaccine: 'The dog needs a chip, then a rabies vaccination.',
    notVaccinated: 'The dog is not vaccinated against rabies.',
    askVaccinated: 'Check the passport to see whether and when the dog was vaccinated against rabies.',
    givenBeforeChip: 'A vaccination given before the chip was implanted does not count.',
    enterDates: 'Enter the date of the last rabies vaccination and the date it is valid until (both are in the passport).',
    datesOutOfOrder: 'The vaccination’s valid-until date must come after the vaccination date: check what you entered.',
    tooYoung: (minAgeWeeks) => `The dog was vaccinated before it was ${minAgeWeeks} weeks old, so that vaccination does not count.`,
    enterDepartureForValidity: 'Enter the departure date so we can check that the vaccination is valid for the whole trip.',
    expiresBeforeDeparture: (validUntil) =>
      `The vaccination is valid until ${validUntil}, before you leave. Get a booster by ${validUntil} at the latest: a booster given before it expires needs no new wait.`,
    expired: (validUntil) => `The vaccination expired on ${validUntil}, so a new vaccination counts as a first one.`,
    firstWait: (readyFrom, waitDays) =>
      `This is a first vaccination, so the dog can travel from ${readyFrom} at the earliest (${waitDays} days after the vaccination). Move your departure.`,
    maybeFirst: (readyFrom) =>
      `If this vaccination was a first one (or was given after the previous one had expired), the dog can travel only from ${readyFrom}. Check the passport to see whether the previous vaccination was still valid on the day of this one.`,
    expiresDuringTrip: (validUntil) =>
      `The vaccination expires on ${validUntil}, before you come back. Get a booster before that day (it can be abroad): a booster given before it expires needs no new wait.`,
    chipOrderUnknown: (validUntil) =>
      `The vaccination is valid until ${validUntil}, for the whole trip. Check the passport to make sure the chip was implanted before the vaccination or on the same day: only then does the vaccination count.`,
    valid: (validUntil) => `The vaccination is valid until ${validUntil}, for the whole trip.`,
  },
  titre: {
    rule: (minDays, minMonths) =>
      `The blood sample for the antibody titre test is taken at least ${minDays} days after the rabies vaccination and at least ${minMonths} months before the trip.`,
    needsVaccination: 'The dog first needs a valid rabies vaccination.',
    earliest: (sampleFrom, travelFrom) => `Earliest sample: ${sampleFrom}; earliest trip after it: ${travelFrom}.`,
    late: (departure) => `That is too late for a departure on ${departure}.`,
    sampleUntil: (date) => `For your departure, the sample has to be taken by ${date} at the latest.`,
  },
  certificate: {
    enterDeparture: 'Enter the departure date so we can work out when to book the certificate.',
    pastDeparture: 'The departure date is in the past: change it.',
    window: (maxDays, departure, from) =>
      `The certificate must be issued no more than ${maxDays} days before you enter the EU: for a departure on ${departure}, no earlier than ${from}.`,
    onward: (months, until) =>
      `After entry the certificate is valid for no more than ${months} months, until ${until}, and your stay is longer: check what you need for the rest of it.`,
  },
  entryPoint: {
    enterTransit: 'List the countries you pass through on the way, so we know where you enter the EU.',
    airport: 'Airport',
    rail: 'Rail crossing',
    road: 'Road crossing',
    noList: (country) =>
      `You enter the EU in ${country.name.en}. We have no checked list of points of entry for pets on this route for that country: check it on the European Commission’s page before you choose a route.`,
    points: (country, kind, names) =>
      `You enter the EU in ${country.name.en}. ${kind} designated for pets: ${names}. At the border, report to customs, who check the certificate and the chip.`,
    datedList: (country, asOf) =>
      `${country.name.en}’s list of points of entry ${asOf ? `dates from ${asOf}` : 'is undated'} and predates the new EU rules: check it before the trip.`,
  },
  passport: {
    yes: 'The dog has a passport. Take it on the trip and check that the chip and vaccinations are recorded in it.',
    no: 'The passport is issued by the authorised vet who implants the chip; if it was lost, ask for a duplicate.',
    unknown: 'Say whether the dog has a pet passport.',
  },
  breed: {
    notListed: 'The restriction does not apply to your dog.',
    askBreed: 'Say whether the dog is one of the listed breeds or a cross of them.',
    fciRegistered: 'The dog is registered with the FCI, so the ban does not apply to it. Take the pedigree as proof.',
    askFci: 'Say whether the dog is registered with the FCI (has a pedigree).',
    bannedEntry: 'You may not enter this country with this dog, not even temporarily.',
    bannedTransit: 'You may not even drive through this country with this dog: choose a route that avoids it.',
    allowedStay: (maxDays, stayDays) =>
      `The dog may stay for no more than ${maxDays} days, with a companion who does not live in that country${stayDays !== null ? ` (your stay: ${stayDays} days)` : ''}. Take the dog’s original documents.`,
    tooLong: (stayDays, maxDays) =>
      `A stay of ${stayDays} days is longer than the ${maxDays} allowed: ask the competent authority for an extension in advance, or shorten the stay.`,
  },
  maxPets: {
    ok: (count, max) =>
      `You are travelling with ${count} ${count === 1 ? 'dog' : 'dogs'}; no more than ${max} pets are allowed (cats and ferrets count too).`,
    tooMany: (max) =>
      `With more than ${max} pets the rules for non-commercial travel do not apply, except for competitions and shows with written proof.`,
  },
  airCabin: {
    theDog: 'The dog',
    tooHeavy: (who, kg, maxKg) => `${who} weighs ${kg} kg, so with the carrier it is over ${maxKg} kg: it cannot fly in the Air Serbia cabin.`,
    tooYoung: (who, weeks) => `${who} will not be ${weeks} weeks old on the day of the flight.`,
    oneCarrier: 'Air Serbia accepts one carrier per passenger.',
  },
};

export const READINESS_MESSAGES: Readonly<Record<Lang, ReadinessMessages>> = { sr: SR, en: EN };
