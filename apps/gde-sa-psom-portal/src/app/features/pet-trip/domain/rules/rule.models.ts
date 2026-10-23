import type { CountryCode } from '../countries';
import type { PrepItemId } from '../costs';
import type { IsoDate } from '../dates';
import type { Label, Localized } from '../lang';
import type { TransportMode } from '../trip.models';

/**
 * The shape of the travel-rule data. Each record says what a rule requires,
 * where it applies, which official pages state it, and when a person last
 * compared it with those pages. The engine (readiness.ts) never reports a
 * record as confirmed when it has no verification date, its review date has
 * passed, or its source is marked as dated; changing a rule means editing its
 * record, bumping `version`, and setting `verifiedAt` again.
 */
export type SourceKind =
  | 'eu-law'
  | 'eu-guidance'
  | 'national-authority'
  | 'transport-provider'
  | 'toll-operator'
  | 'central-bank';

export interface SourceRecord {
  id: string;
  /** Translated, or the page's own title where that is what a reader would look for. */
  title: Label;
  publisher: Label;
  url: string;
  kind: SourceKind;
  /** The day the page was opened and its text compared with the records that cite it. */
  checkedAt: IsoDate;
}

/** Designated points of entry for pets of one EU country. */
export interface EntryPointList {
  /** Road crossings by the country the car arrives from; `any` = every designated road crossing. */
  road?: Partial<Record<CountryCode | 'any', readonly Label[]>>;
  rail?: readonly Label[];
  /** Airports by city, which has a Serbian and an English name ("Beč" / "Vienna"). */
  air?: readonly Label[];
  /** When the list was published: YYYY-MM-DD, or YYYY when the source gives only the year; null when undated. */
  asOf: string | null;
  /**
   * False for lists that predate the 2026 rules and have no newer
   * replacement we could find: they are shown, but as "needs verification".
   */
  current: boolean;
  sourceIds: readonly string[];
}

export type EntryPoints = Partial<Record<CountryCode, EntryPointList>>;

/**
 * How the engine evaluates a record. The numbers come from the sources and
 * live in the data, so a rule change is a data change.
 */
export type RuleCheck =
  | { kind: 'microchip' }
  | { kind: 'rabies-vaccination'; minAgeWeeks: number; primaryWaitDays: number }
  | { kind: 'titre-test'; minDaysAfterVaccination: number; minMonthsBeforeTravel: number }
  | { kind: 'health-certificate'; maxDaysBeforeEntry: number; onwardValidityMonths: number }
  | { kind: 'entry-point'; points: EntryPoints }
  | { kind: 'pet-passport' }
  | {
      kind: 'breed-restriction';
      country: CountryCode;
      /** Longest stay allowed for a listed breed; null = not allowed at all. */
      maxStayDays: number | null;
      /** A listed breed is allowed when registered with the FCI (Croatia). */
      allowedIfFciRegistered: boolean;
    }
  | { kind: 'max-pets'; max: number }
  /** Cabin-only air travel with a weight limit for pet and carrier together: the carrier confirms each booking. */
  | { kind: 'air-cabin'; maxKg: number; minAgeWeeks: number }
  /** A verified fact that applies as stated; nothing to compute. */
  | { kind: 'info' }
  /** An action without a computable date (sign a form, plan a route). */
  | { kind: 'action' }
  /** A carrier, authority or vet decides, or the source is not settled: always "needs verification". */
  | { kind: 'verify' };

export interface RuleScope {
  /** Only non-commercial movement is covered. */
  movement: 'non-commercial';
  /**
   * Where the rule applies:
   * - `eu-entry`: the route enters the EU;
   * - `destination`: the destination is one of `countries`;
   * - `transit`: one of `countries` is crossed on the way (not the destination);
   * - `route`: destination or transit;
   * - `return-home`: the trip comes back to Serbia (from one of `countries`, when given);
   * - `any`: every trip from Serbia.
   */
  where: 'eu-entry' | 'destination' | 'transit' | 'route' | 'return-home' | 'any';
  countries?: readonly CountryCode[];
  /** Limits the rule to these ways of travelling. */
  transport?: readonly TransportMode[];
}

export interface RuleRecord {
  /** Stable id, e.g. "eu.rabies-vaccination". Report items and AI output refer to it. */
  id: string;
  /** Bumped whenever the content changes. */
  version: number;
  title: Localized;
  /** What the rule says, in plain words, without the trip's details. */
  summary: Localized;
  scope: RuleScope;
  check: RuleCheck;
  /** Ids from the source registry; every record has at least one. */
  sourceIds: readonly string[];
  /** Null when no one has confirmed the rule against its sources. */
  verifiedAt: IsoDate | null;
  /** After this date the record is stale and reported as "needs verification". */
  reviewBy: IsoDate;
  /**
   * Set when the only official source is old or archived: the rule is shown
   * with its computed dates but always as "needs verification", and never
   * blocks the trip on its own.
   */
  dated?: Localized;
  /** What the sources leave open; shown next to the item. */
  caveat?: Localized;
  /** Practical steps: where to apply, what to bring. */
  howTo?: Localized;
  /** Preparation steps (with a cost) the rule can require. */
  prep?: readonly PrepItemId[];
}

/** How well a destination is covered, said plainly to the visitor. */
export interface DestinationCoverage {
  level: 'full' | 'partial' | 'none';
  note: Localized;
}

export interface Ruleset {
  /** Date-based version of the whole dataset: "2026-10-23.1". */
  version: string;
  origin: 'RS';
  sources: readonly SourceRecord[];
  rules: readonly RuleRecord[];
  coverage: Partial<Record<CountryCode, DestinationCoverage>>;
}
