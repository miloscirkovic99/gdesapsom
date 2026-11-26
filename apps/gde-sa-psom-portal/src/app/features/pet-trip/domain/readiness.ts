import { country, type CountryCode } from './countries';
import type { PrepItemId } from './costs';
import { addDays, addMonths, daysBetween, formatDate, type IsoDate, latest } from './dates';
import { type Label, type Lang, localize } from './lang';
import { READINESS_MESSAGES, type ReadinessMessages } from './readiness.messages';
import type { RuleCheck, RuleRecord, Ruleset, SourceRecord } from './rules/rule.models';
import { type DogProfile, tripNights, type TripPlan } from './trip.models';

/**
 * The readiness check: trip + ruleset + today's date in, report out, written
 * in the language asked for. Pure and deterministic, so every status and
 * deadline can be tested.
 *
 * Statuses:
 * - `confirmed`: an official, current rule, and the answers show it is met;
 * - `action-required`: an official, current rule that still needs doing, with
 *   its deadline when one can be computed;
 * - `needs-verification`: the rule is unverified, past its review date or
 *   known only from an old source, the sources leave it open, or a carrier,
 *   vet or authority decides;
 * - `insufficient-info`: the rule is known but the answers do not say enough.
 *
 * A report is never "ready" while any item needs verification or information,
 * and a rule known only from an old source never blocks a trip on its own: it
 * shows what its dates would mean, as something to check.
 */
export type ItemStatus = 'confirmed' | 'action-required' | 'needs-verification' | 'insufficient-info';

/** Display order: what needs doing first. */
export const ITEM_STATUSES: readonly ItemStatus[] = ['action-required', 'insufficient-info', 'needs-verification', 'confirmed'];

export type OverallReadiness =
  /** Every applicable rule is confirmed and met. */
  | 'ready'
  /** A confirmed requirement cannot be met: too late for the chosen date, or not allowed at all. */
  | 'blocked'
  | 'action-required'
  | 'incomplete'
  /** Known requirements are met; others need checking with a vet, carrier or authority. */
  | 'verify'
  /** No rules for this route, or commercial movement: partial report. */
  | 'unsupported';

export interface DateWindow {
  from: IsoDate | null;
  until: IsoDate | null;
}

export interface ReadinessItem {
  /** Unique in the report: the rule id, plus the dog for per-dog rules. */
  key: string;
  ruleId: string;
  dogId: string | null;
  /** "Pas 2" when the trip has more than one dog. */
  dogLabel: string | null;
  title: string;
  status: ItemStatus;
  /** For this trip: what the answers show and what to do. */
  detail: string;
  /** The rule itself, as the sources state it. */
  summary: string;
  howTo: string | null;
  window: DateWindow | null;
  /** The requirement cannot be met in time for the chosen departure date. */
  late: boolean;
  /** The rule does not allow this trip at all (a breed ban on the route). */
  blocked: boolean;
  /** Earliest departure this requirement allows, when it limits the trip. */
  earliestDeparture: IsoDate | null;
  /** The dates come from a rule known only from an old source: shown, but not binding. */
  conditional: boolean;
  sources: SourceRecord[];
  verifiedAt: IsoDate | null;
  /** Never verified, or past its review date. */
  stale: boolean;
  /** Why the only official source may be out of date. */
  dated: string | null;
  caveat: string | null;
  /** Vet visits (with a cost) that doing this item means. */
  prep: PrepItemId[];
}

export interface TimelineEntry {
  date: IsoDate;
  /** `from` opens a window, `until` is a deadline. */
  kind: 'from' | 'until';
  text: string;
  itemKey: string;
}

export interface ReadinessReport {
  rulesetVersion: string;
  today: IsoDate;
  destination: CountryCode;
  coverage: 'full' | 'partial' | 'none';
  coverageNote: string;
  overall: OverallReadiness;
  items: ReadinessItem[];
  counts: Record<ItemStatus, number>;
  /** Earliest departure the confirmed rules allow; null when they do not limit it. */
  earliestDeparture: IsoDate | null;
  prepItems: PrepItemId[];
  timeline: TimelineEntry[];
  /** Assumptions the dates rest on. */
  assumptions: string[];
}

interface Evaluation {
  status: ItemStatus;
  detail: string;
  window?: DateWindow | null;
  late?: boolean;
  blocked?: boolean;
  earliestDeparture?: IsoDate | null;
  /** Doing the item means the rule's preparation steps. */
  needsPrep?: boolean;
  /** Sources beyond the rule's own (an entry-point list). */
  extraSourceIds?: readonly string[];
  /** The part of the data the item rests on is old (an entry-point list). */
  dated?: string;
}

/** What evaluators share: the date, the language, and numbers one rule needs from another. */
interface EvaluationContext {
  today: IsoDate;
  lang: Lang;
  t: ReadinessMessages;
  fmt: (date: IsoDate) => string;
  /** Days between rabies vaccination and travel, from the rabies rule: the chip deadline depends on it. */
  vaccinationWaitDays: number | null;
  vaccinationMinAgeWeeks: number;
}

const PER_DOG: ReadonlySet<RuleCheck['kind']> = new Set([
  'microchip',
  'rabies-vaccination',
  'titre-test',
  'pet-passport',
  'breed-restriction',
]);

/**
 * The countries the trip crosses, ending with the destination. A flight is
 * taken as direct: its route is the destination alone.
 */
function routeOf(trip: TripPlan): CountryCode[] {
  if (trip.transport === 'plane') return [trip.destination];
  return [...trip.transitCountries.filter((code) => code !== trip.destination && code !== 'RS'), trip.destination];
}

/**
 * The EU country where the dog enters the EU: the first EU country on the
 * route. Null when the route is not known well enough to say (a car to a
 * country that does not border Serbia, with no transit countries given).
 */
export function euEntryCountry(trip: TripPlan): CountryCode | null {
  const route = routeOf(trip);
  const first = route.find((code) => country(code).inEu) ?? null;
  if (!first) return null;
  if (trip.transport !== 'plane' && route.length === 1 && !country(first).bordersSerbia) return null;
  return first;
}

function applies(rule: RuleRecord, trip: TripPlan): boolean {
  const { scope } = rule;
  if (scope.transport && !scope.transport.includes(trip.transport)) return false;
  const route = routeOf(trip);
  const transit = route.slice(0, -1);
  const listed = (code: CountryCode) => !!scope.countries?.includes(code);
  switch (scope.where) {
    case 'any':
      return true;
    case 'eu-entry':
      return route.some((code) => country(code).inEu);
    case 'destination':
      return listed(trip.destination);
    case 'transit':
      return transit.some(listed);
    case 'route':
      return route.some(listed);
    case 'return-home':
      return trip.returnDate !== null && (!scope.countries || listed(trip.destination));
  }
}

const isStale = (rule: RuleRecord, today: IsoDate): boolean => !rule.verifiedAt || today > rule.reviewBy;

export function assessTrip(trip: TripPlan, ruleset: Ruleset, today: IsoDate, lang: Lang): ReadinessReport {
  const t = READINESS_MESSAGES[lang];
  const sources = new Map(ruleset.sources.map((source) => [source.id, source]));
  const destination = country(trip.destination);
  const known = ruleset.coverage[trip.destination];
  const coverage = known
    ? { level: known.level, note: known.note[lang] }
    : destination.inEu
      ? { level: 'partial' as const, note: t.coverageEu(destination) }
      : { level: 'none' as const, note: t.coverageNone(destination) };
  const assumptions = [trip.transport === 'plane' ? t.assumePlane : t.assumeRoad];

  const rabies = ruleset.rules.find((rule) => rule.check.kind === 'rabies-vaccination')?.check;
  const context: EvaluationContext = {
    today,
    lang,
    t,
    fmt: (date) => formatDate(date, lang),
    vaccinationWaitDays: rabies?.kind === 'rabies-vaccination' ? rabies.primaryWaitDays : null,
    vaccinationMinAgeWeeks: rabies?.kind === 'rabies-vaccination' ? rabies.minAgeWeeks : 12,
  };

  const items: ReadinessItem[] = [];
  const multipleDogs = trip.dogs.length > 1;

  if (trip.purpose === 'commercial') {
    items.push(syntheticItem('movement.commercial', t.commercialTitle, t.commercialDetail));
  } else {
    for (const rule of ruleset.rules) {
      if (!applies(rule, trip)) continue;
      const targets: (DogProfile | null)[] = PER_DOG.has(rule.check.kind) ? trip.dogs : [null];
      targets.forEach((dog, index) => {
        const evaluation = evaluate(rule, trip, dog, context);
        items.push(toItem(rule, evaluation, dog, multipleDogs ? t.dogLabel(index) : null, sources, context));
      });
    }
    if (coverage.level === 'none') {
      items.push(syntheticItem(
        `coverage.${trip.destination}`,
        t.coverageItemTitle(destination),
        t.coverageItemDetail(coverage.note),
      ));
    }
  }

  const ordered = ITEM_STATUSES.flatMap((status) => items.filter((item) => item.status === status));
  const counts = Object.fromEntries(ITEM_STATUSES.map((status) => [status, 0])) as Record<ItemStatus, number>;
  for (const item of ordered) counts[item.status]++;

  let overall: OverallReadiness;
  if (trip.purpose === 'commercial' || coverage.level === 'none') overall = 'unsupported';
  else if (ordered.some((item) => item.late || item.blocked)) overall = 'blocked';
  else if (counts['action-required']) overall = 'action-required';
  else if (counts['insufficient-info']) overall = 'incomplete';
  else if (counts['needs-verification']) overall = 'verify';
  else overall = 'ready';

  return {
    rulesetVersion: ruleset.version,
    today,
    destination: trip.destination,
    coverage: coverage.level,
    coverageNote: coverage.note,
    overall,
    items: ordered,
    counts,
    earliestDeparture: latest(...ordered.filter((item) => !item.conditional).map((item) => item.earliestDeparture)),
    prepItems: [...new Set(ordered.flatMap((item) => item.prep))],
    timeline: timelineOf(ordered),
    assumptions,
  };
}

function syntheticItem(key: string, title: string, detail: string): ReadinessItem {
  return {
    key,
    ruleId: key,
    dogId: null,
    dogLabel: null,
    title,
    status: 'needs-verification',
    detail,
    summary: detail,
    howTo: null,
    window: null,
    late: false,
    blocked: false,
    earliestDeparture: null,
    conditional: false,
    sources: [],
    verifiedAt: null,
    stale: false,
    dated: null,
    caveat: null,
    prep: [],
  };
}

function toItem(
  rule: RuleRecord,
  evaluation: Evaluation,
  dog: DogProfile | null,
  dogLabel: string | null,
  sources: Map<string, SourceRecord>,
  context: EvaluationContext,
): ReadinessItem {
  const { lang, t } = context;
  const stale = isStale(rule, context.today);
  const dated = rule.dated?.[lang] ?? evaluation.dated ?? null;
  const unsettled = stale || !!dated;
  let status = evaluation.status;
  let detail = evaluation.detail;
  if (unsettled && status !== 'insufficient-info') {
    status = 'needs-verification';
    if (stale) {
      detail = `${rule.verifiedAt ? t.staleRule(context.fmt(rule.verifiedAt)) : t.unverifiedRule} ${detail}`;
    }
  }
  const sourceIds = [...rule.sourceIds, ...(evaluation.extraSourceIds ?? [])];
  // A Serbian date ending a sentence ("12. decembra 2026.") already carries its full stop.
  detail = detail.replace(/\.\.(?=\s|$)/g, '.');
  return {
    key: dog ? `${rule.id}:${dog.id}` : rule.id,
    ruleId: rule.id,
    dogId: dog?.id ?? null,
    dogLabel,
    title: rule.title[lang],
    status,
    detail,
    summary: rule.summary[lang],
    howTo: rule.howTo?.[lang] ?? null,
    window: evaluation.window ?? null,
    // An unsettled rule shows its dates but never blocks the trip by itself.
    late: !unsettled && !!evaluation.late,
    blocked: !unsettled && !!evaluation.blocked,
    earliestDeparture: evaluation.earliestDeparture ?? null,
    conditional: unsettled,
    sources: [...new Set(sourceIds)].map((id) => sources.get(id)).filter((source): source is SourceRecord => !!source),
    verifiedAt: rule.verifiedAt,
    stale,
    dated,
    caveat: rule.caveat?.[lang] ?? null,
    prep: evaluation.needsPrep && rule.prep ? [...rule.prep] : [],
  };
}

function evaluate(rule: RuleRecord, trip: TripPlan, dog: DogProfile | null, context: EvaluationContext): Evaluation {
  const { check } = rule;
  switch (check.kind) {
    case 'microchip':
      return evaluateMicrochip(dog as DogProfile, trip, context);
    case 'rabies-vaccination':
      return evaluateRabies(dog as DogProfile, trip, check, context);
    case 'titre-test':
      return evaluateTitre(dog as DogProfile, trip, check, context);
    case 'health-certificate':
      return evaluateCertificate(trip, check, context);
    case 'entry-point':
      return evaluateEntryPoint(trip, check, context);
    case 'pet-passport':
      return evaluatePassport(dog as DogProfile, context);
    case 'breed-restriction':
      return evaluateBreed(dog as DogProfile, trip, check, context);
    case 'max-pets':
      return evaluateMaxPets(trip, check, context);
    case 'air-cabin':
      return evaluateAirCabin(trip, rule, check, context);
    case 'info':
      return { status: 'confirmed', detail: rule.summary[context.lang] };
    case 'action':
      return { status: 'action-required', detail: rule.summary[context.lang], needsPrep: true };
    case 'verify':
      return { status: 'needs-verification', detail: rule.summary[context.lang], needsPrep: true };
  }
}

function evaluateMicrochip(dog: DogProfile, trip: TripPlan, context: EvaluationContext): Evaluation {
  const { t, fmt } = context;
  switch (dog.microchip) {
    case 'iso':
      return { status: 'confirmed', detail: t.microchip.iso };
    case 'other':
      return { status: 'action-required', detail: t.microchip.other };
    case 'unknown-type':
      return { status: 'needs-verification', detail: t.microchip.unknownType };
    case 'none': {
      const wait = context.vaccinationWaitDays;
      const until = trip.departureDate && wait !== null ? addDays(trip.departureDate, -wait) : null;
      return {
        status: 'action-required',
        detail: t.microchip.none(until ? fmt(until) : null),
        window: { from: null, until },
        needsPrep: true,
      };
    }
  }
}

/** The dog's rabies vaccination as the rules count it, or null when there is none that counts. */
function countedVaccination(dog: DogProfile, minAgeWeeks: number): { date: IsoDate; validUntil: IsoDate | null } | null {
  if (dog.microchip === 'none' || dog.rabiesVaccinated !== 'yes' || dog.chipBeforeVaccination === 'no') return null;
  if (!dog.rabiesVaccinationDate) return null;
  if (dog.birthDate && dog.rabiesVaccinationDate < addDays(dog.birthDate, minAgeWeeks * 7)) return null;
  return { date: dog.rabiesVaccinationDate, validUntil: dog.rabiesValidUntil };
}

function evaluateRabies(
  dog: DogProfile,
  trip: TripPlan,
  check: Extract<RuleCheck, { kind: 'rabies-vaccination' }>,
  context: EvaluationContext,
): Evaluation {
  const { today, fmt } = context;
  const t = context.t.rabies;
  const departure = trip.departureDate;
  const wait = check.primaryWaitDays;
  const minDate = dog.birthDate ? addDays(dog.birthDate, check.minAgeWeeks * 7) : null;

  const vaccinateNow = (reason: string): Evaluation => {
    const from = latest(today, minDate) as IsoDate;
    const earliest = addDays(from, wait);
    const until = departure ? addDays(departure, -wait) : null;
    const late = !!departure && departure < earliest;
    const parts = [reason, t.rules(check.minAgeWeeks, wait)];
    if (!dog.birthDate) parts.push(t.noBirthDate);
    if (late) parts.push(t.late(fmt(departure as IsoDate), fmt(earliest)));
    else if (until) parts.push(t.window(fmt(from), fmt(until)));
    else parts.push(t.enterDeparture);
    return {
      status: 'action-required',
      detail: parts.join(' '),
      window: { from, until },
      late,
      earliestDeparture: earliest,
      needsPrep: true,
    };
  };
  const missing = (detail: string): Evaluation => ({ status: 'insufficient-info', detail });

  if (dog.microchip === 'none') {
    return vaccinateNow(dog.rabiesVaccinated === 'yes' ? t.vaccinatedBeforeChip : t.needsChipThenVaccine);
  }
  if (dog.rabiesVaccinated === 'no') return vaccinateNow(t.notVaccinated);
  if (dog.rabiesVaccinated === 'unknown') return missing(t.askVaccinated);
  if (dog.chipBeforeVaccination === 'no') return vaccinateNow(t.givenBeforeChip);

  const vaccinated = dog.rabiesVaccinationDate;
  const validUntil = dog.rabiesValidUntil;
  if (!vaccinated || !validUntil) return missing(t.enterDates);
  if (validUntil <= vaccinated) return missing(t.datesOutOfOrder);
  if (minDate && vaccinated < minDate) return vaccinateNow(t.tooYoung(check.minAgeWeeks));
  if (!departure) return missing(t.enterDepartureForValidity);

  if (validUntil < departure) {
    if (today <= validUntil) {
      return {
        status: 'action-required',
        detail: t.expiresBeforeDeparture(fmt(validUntil)),
        window: { from: null, until: validUntil },
        needsPrep: true,
      };
    }
    return vaccinateNow(t.expired(fmt(validUntil)));
  }

  const readyFrom = addDays(vaccinated, wait);
  if (departure < readyFrom) {
    if (dog.rabiesPrimary === 'yes') {
      return {
        status: 'action-required',
        detail: t.firstWait(fmt(readyFrom), wait),
        window: { from: readyFrom, until: null },
        late: true,
        earliestDeparture: readyFrom,
      };
    }
    if (dog.rabiesPrimary === 'unknown') {
      return {
        status: 'needs-verification',
        detail: t.maybeFirst(fmt(readyFrom)),
        window: { from: readyFrom, until: null },
      };
    }
  }

  const end = trip.returnDate ?? departure;
  if (validUntil < end) {
    return {
      status: 'action-required',
      detail: t.expiresDuringTrip(fmt(validUntil)),
      window: { from: null, until: validUntil },
      needsPrep: true,
    };
  }
  if (dog.chipBeforeVaccination === 'unknown') {
    return { status: 'needs-verification', detail: t.chipOrderUnknown(fmt(validUntil)) };
  }
  return { status: 'confirmed', detail: t.valid(fmt(validUntil)) };
}

function evaluateTitre(
  dog: DogProfile,
  trip: TripPlan,
  check: Extract<RuleCheck, { kind: 'titre-test' }>,
  context: EvaluationContext,
): Evaluation {
  const { today, fmt } = context;
  const t = context.t.titre;
  const departure = trip.departureDate;
  const vaccination = countedVaccination(dog, context.vaccinationMinAgeWeeks);
  const vaccinationValid = !!vaccination && (!vaccination.validUntil || vaccination.validUntil >= today);
  const minVaccination = dog.birthDate ? addDays(dog.birthDate, context.vaccinationMinAgeWeeks * 7) : null;
  const vaccinatedOn = vaccinationValid ? (vaccination as { date: IsoDate }).date : (latest(today, minVaccination) as IsoDate);
  const sampleFrom = latest(today, addDays(vaccinatedOn, check.minDaysAfterVaccination)) as IsoDate;
  const earliest = addMonths(sampleFrom, check.minMonthsBeforeTravel);
  const sampleUntil = departure ? addMonths(departure, -check.minMonthsBeforeTravel) : null;
  const late = !!departure && departure < earliest;

  const parts = [
    t.rule(check.minDaysAfterVaccination, check.minMonthsBeforeTravel),
    vaccinationValid ? '' : t.needsVaccination,
    t.earliest(fmt(sampleFrom), fmt(earliest)),
    late ? t.late(fmt(departure as IsoDate)) : sampleUntil ? t.sampleUntil(fmt(sampleUntil)) : '',
  ].filter(Boolean);
  return {
    status: 'action-required',
    detail: parts.join(' '),
    window: { from: sampleFrom, until: sampleUntil },
    late,
    earliestDeparture: earliest,
    needsPrep: true,
  };
}

function evaluateCertificate(
  trip: TripPlan,
  check: Extract<RuleCheck, { kind: 'health-certificate' }>,
  context: EvaluationContext,
): Evaluation {
  const { today, fmt } = context;
  const t = context.t.certificate;
  const departure = trip.departureDate;
  if (!departure) return { status: 'insufficient-info', detail: t.enterDeparture, needsPrep: true };
  if (departure < today) return { status: 'insufficient-info', detail: t.pastDeparture, needsPrep: true };
  const from = addDays(departure, -check.maxDaysBeforeEntry);
  const parts = [t.window(check.maxDaysBeforeEntry, fmt(departure), fmt(from))];
  const onwardUntil = addMonths(departure, check.onwardValidityMonths);
  if (trip.returnDate && trip.returnDate > onwardUntil) {
    parts.push(t.onward(check.onwardValidityMonths, fmt(onwardUntil)));
  }
  return { status: 'action-required', detail: parts.join(' '), window: { from, until: departure }, needsPrep: true };
}

/** When an entry-point list was published: a date, or the year alone ("2006."). */
function listDate(asOf: string, context: EvaluationContext): string {
  if (/^\d{4}$/.test(asOf)) return context.lang === 'sr' ? `${asOf}.` : asOf;
  return context.fmt(asOf);
}

function evaluateEntryPoint(trip: TripPlan, check: Extract<RuleCheck, { kind: 'entry-point' }>, context: EvaluationContext): Evaluation {
  const t = context.t.entryPoint;
  const entry = euEntryCountry(trip);
  if (!entry) return { status: 'insufficient-info', detail: t.enterTransit };
  const info = country(entry);
  const list = check.points[entry];
  const route = ['RS' as CountryCode, ...routeOf(trip)];
  const arrivingFrom = route[route.indexOf(entry) - 1] ?? 'RS';

  let kind: string;
  let names: readonly Label[] | undefined;
  switch (trip.transport) {
    case 'plane':
      kind = t.airport;
      names = list?.air;
      break;
    case 'train':
      kind = t.rail;
      names = list?.rail;
      break;
    default:
      kind = t.road;
      names = list?.road?.[arrivingFrom] ?? list?.road?.['any'];
  }

  if (!list || !names?.length) {
    return { status: 'needs-verification', detail: t.noList(info), extraSourceIds: list?.sourceIds ?? [] };
  }
  return {
    status: 'action-required',
    detail: t.points(info, kind, names.map((name) => localize(name, context.lang)).join(', ')),
    extraSourceIds: list.sourceIds,
    dated: list.current ? undefined : t.datedList(info, list.asOf ? listDate(list.asOf, context) : null),
  };
}

function evaluatePassport(dog: DogProfile, context: EvaluationContext): Evaluation {
  const t = context.t.passport;
  switch (dog.passport) {
    case 'yes':
      return { status: 'confirmed', detail: t.yes };
    case 'no':
      return { status: 'action-required', detail: t.no };
    case 'unknown':
      return { status: 'insufficient-info', detail: t.unknown };
  }
}

function evaluateBreed(
  dog: DogProfile,
  trip: TripPlan,
  check: Extract<RuleCheck, { kind: 'breed-restriction' }>,
  context: EvaluationContext,
): Evaluation {
  const t = context.t.breed;
  if (dog.restrictedBreed === 'no') return { status: 'confirmed', detail: t.notListed };
  if (dog.restrictedBreed === 'unknown') return { status: 'insufficient-info', detail: t.askBreed };
  const atDestination = trip.destination === check.country;

  if (check.allowedIfFciRegistered) {
    if (dog.fciRegistered === 'yes') return { status: 'confirmed', detail: t.fciRegistered };
    if (dog.fciRegistered === 'unknown') return { status: 'insufficient-info', detail: t.askFci };
  }
  if (check.maxStayDays === null) {
    return { status: 'action-required', detail: atDestination ? t.bannedEntry : t.bannedTransit, blocked: true };
  }
  const stayDays = atDestination ? tripNights(trip) + 1 : 1;
  if (stayDays <= check.maxStayDays) {
    return { status: 'action-required', detail: t.allowedStay(check.maxStayDays, atDestination ? stayDays : null) };
  }
  return { status: 'needs-verification', detail: t.tooLong(stayDays, check.maxStayDays) };
}

function evaluateMaxPets(trip: TripPlan, check: Extract<RuleCheck, { kind: 'max-pets' }>, context: EvaluationContext): Evaluation {
  const count = trip.dogs.length;
  if (count <= check.max) return { status: 'confirmed', detail: context.t.maxPets.ok(count, check.max) };
  return { status: 'action-required', detail: context.t.maxPets.tooMany(check.max), blocked: true };
}

function evaluateAirCabin(
  trip: TripPlan,
  rule: RuleRecord,
  check: Extract<RuleCheck, { kind: 'air-cabin' }>,
  context: EvaluationContext,
): Evaluation {
  const t = context.t.airCabin;
  const notes: string[] = [];
  trip.dogs.forEach((dog, index) => {
    const who = trip.dogs.length > 1 ? context.t.dogLabel(index) : t.theDog;
    if (dog.weightKg !== null && dog.weightKg > check.maxKg) notes.push(t.tooHeavy(who, dog.weightKg, check.maxKg));
    if (dog.birthDate && trip.departureDate && daysBetween(dog.birthDate, trip.departureDate) < check.minAgeWeeks * 7) {
      notes.push(t.tooYoung(who, check.minAgeWeeks));
    }
  });
  if (trip.dogs.length > trip.travelers) notes.push(t.oneCarrier);
  return { status: 'needs-verification', detail: [rule.summary[context.lang], ...notes].join(' ') };
}

function timelineOf(items: readonly ReadinessItem[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  for (const item of items) {
    if (!item.window || item.late || item.status === 'confirmed') continue;
    const text = item.dogLabel ? `${item.title} (${item.dogLabel})` : item.title;
    const { from, until } = item.window;
    if (from) entries.push({ date: from, kind: 'from', text, itemKey: item.key });
    if (until) entries.push({ date: until, kind: 'until', text, itemKey: item.key });
  }
  return entries.sort((a, b) => (a.date === b.date ? a.kind.localeCompare(b.kind) : a.date < b.date ? -1 : 1));
}
