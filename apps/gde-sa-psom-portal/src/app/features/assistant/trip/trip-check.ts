import { country, type CountryCode } from '../../pet-trip/domain/countries';
import { formatDate, type IsoDate } from '../../pet-trip/domain/dates';
import type { Lang } from '../../pet-trip/domain/lang';
import { assessTrip, type ItemStatus, type OverallReadiness } from '../../pet-trip/domain/readiness';
import { RULESET } from '../../pet-trip/domain/rules/ruleset';
import { emptyDog, MAX_DOGS, type TransportMode, type TripPlan } from '../../pet-trip/domain/trip.models';
import { COPY, ROUTE_SUGGESTIONS, routeLabel } from '../../pet-trip/pet-trip-copy';
import { prefillParams } from '../../pet-trip/trip-prefill';
import type { TripQuery } from '../domain/query.models';

/** Items the reply lists; the planner shows them all. */
const ITEMS_SHOWN = 5;

export interface TripCheckItem {
  key: string;
  title: string;
  status: ItemStatus;
  statusLabel: string;
  /** "od 10. decembra 2026." / "do 20. decembra 2026.", when the rule gives dates for this trip. */
  dates: string | null;
  dogLabel: string | null;
  late: boolean;
}

/** A short readiness check for a trip described in the chat, written in the site's language. */
export interface TripCheck {
  destination: CountryCode;
  transport: TransportMode;
  /** "Hrvatska · kolima · 20. decembra 2026." */
  headline: string;
  /** The driving route assumed for a country without a border with Serbia, as text. */
  route: string | null;
  overall: OverallReadiness;
  verdict: { title: string; text: string };
  /** Set when the trip is not fully covered by checked rules. */
  coverageNote: string | null;
  earliestDeparture: string | null;
  items: TripCheckItem[];
  /** Items not listed in the reply. */
  more: number;
  missingDate: boolean;
  disclaimer: string;
  /** Query parameters for /putovanje-sa-psom. */
  plannerParams: Record<string, string>;
}

const TRANSPORT_PHRASE: Readonly<Record<Lang, Readonly<Record<TransportMode, string>>>> = {
  sr: { car: 'kolima', plane: 'avionom', bus: 'autobusom', train: 'vozom', other: 'drugim prevozom' },
  en: { car: 'by car', plane: 'by plane', bus: 'by bus', train: 'by train', other: 'other transport' },
};

/**
 * The trip as far as the chat knows it, through the planner's own readiness
 * check (assessTrip over the verified ruleset), with an empty profile for
 * each dog: the report then says what has to be done and by when, and what
 * the visitor still has to tell the planner about the dog.
 */
export function checkTrip(query: TripQuery, today: IsoDate, lang: Lang): TripCheck | null {
  const destination = query.destination;
  if (!destination || destination === 'RS') return null;
  const transport = query.transport ?? 'car';
  const destinationInfo = country(destination);
  // A car trip to a country without a border with Serbia goes through others; take the usual route.
  const transit: CountryCode[] =
    transport === 'plane' || destinationInfo.bordersSerbia ? [] : [...(ROUTE_SUGGESTIONS[destination]?.[0] ?? [])];
  const dogs = Math.min(Math.max(query.dogs ?? 1, 1), MAX_DOGS);

  const trip: TripPlan = {
    origin: 'RS',
    departureCity: '',
    destination,
    destinationCity: '',
    transitCountries: transit,
    departureDate: query.departureDate,
    returnDate: query.returnDate,
    transport,
    purpose: 'non-commercial',
    travelers: 1,
    dogs: Array.from({ length: dogs }, (_, index) => emptyDog(index)),
  };
  const report = assessTrip(trip, RULESET, today, lang);
  const copy = COPY[lang];

  const open = report.items.filter((item) => item.status !== 'confirmed');
  const items = open.slice(0, ITEMS_SHOWN).map((item): TripCheckItem => {
    const from = item.window?.from ? copy.readiness.timelineFrom + ' ' + formatDate(item.window.from, lang) : null;
    const until = item.window?.until ? copy.readiness.timelineUntil + ' ' + formatDate(item.window.until, lang) : null;
    return {
      key: item.key,
      title: item.title,
      status: item.status,
      statusLabel: copy.status[item.status],
      dates: [from, until].filter(Boolean).join(' · ') || null,
      dogLabel: item.dogLabel,
      late: item.late,
    };
  });

  const date = query.departureDate ? formatDate(query.departureDate, lang) : null;
  return {
    destination,
    transport,
    headline: [destinationInfo.name[lang], TRANSPORT_PHRASE[lang][transport], date].filter(Boolean).join(' · '),
    route: transit.length ? routeLabel(transit, lang) : null,
    overall: report.overall,
    verdict: copy.overall[report.overall],
    coverageNote: report.coverage === 'full' ? null : report.coverageNote,
    earliestDeparture: report.earliestDeparture ? formatDate(report.earliestDeparture, lang) : null,
    items,
    more: open.length - items.length,
    missingDate: !query.departureDate,
    disclaimer: copy.disclaimer,
    plannerParams: prefillParams({
      destination,
      transport,
      transit: transit.length ? transit : null,
      departureDate: query.departureDate,
      returnDate: query.returnDate,
      dogs: query.dogs,
    }),
  };
}
