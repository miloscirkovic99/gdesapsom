import type { CountryCode } from './countries';
import { daysBetween, type IsoDate } from './dates';

/**
 * The trip as the visitor describes it once. The readiness check and every
 * cost scenario read from this object, so nothing is asked twice.
 *
 * Deliberately absent: names, contact details, the dog's name or breed. None
 * of the supported rules depends on them.
 */
export type TransportMode = 'car' | 'plane' | 'bus' | 'train' | 'other';

export const TRANSPORT_MODES: readonly TransportMode[] = ['car', 'plane', 'bus', 'train', 'other'];

/**
 * Why the dog travels. Only `non-commercial` (the dog travels with its owner,
 * or a person the owner authorised, and is not sold or handed over) is covered;
 * anything else follows the rules for commercial movement, which this tool
 * does not assess.
 */
export type MovementPurpose = 'non-commercial' | 'commercial';

export type YesNoUnknown = 'yes' | 'no' | 'unknown';

export type MicrochipStatus = 'iso' | 'other' | 'unknown-type' | 'none';

export interface DogProfile {
  /** "dog-1", "dog-2": stable keys for per-dog report items. */
  id: string;
  /** Needed for the minimum age at rabies vaccination; may be approximate. */
  birthDate: IsoDate | null;
  microchip: MicrochipStatus;
  /** Was the chip in place before (or on the day of) the rabies vaccination? */
  chipBeforeVaccination: YesNoUnknown;
  rabiesVaccinated: YesNoUnknown;
  /** Date of the last rabies vaccination. */
  rabiesVaccinationDate: IsoDate | null;
  /** "Važi do" from the vaccination record. */
  rabiesValidUntil: IsoDate | null;
  /**
   * Was the last vaccination the first one, or one given after the previous
   * vaccine had already run out? Only then does a waiting period apply.
   */
  rabiesPrimary: YesNoUnknown;
  /** The Serbian pet passport, issued with the microchip; it goes with the dog on every trip. */
  passport: YesNoUnknown;
  /**
   * Pit bull terrier, American Staffordshire terrier, Staffordshire bull
   * terrier, bull terrier or a cross of them. Asked only when Germany or
   * Croatia is on the route, where these breeds are restricted.
   */
  restrictedBreed: YesNoUnknown;
  /** Registered with the FCI (a pedigree): Croatia admits the breeds above only then. */
  fciRegistered: YesNoUnknown;
  /** Only asked for air travel, where carriers set weight limits. */
  weightKg: number | null;
}

export interface TripPlan {
  /** The MVP covers departures from Serbia only. */
  origin: 'RS';
  departureCity: string;
  destination: CountryCode;
  destinationCity: string;
  /** In driving order, from Serbia to the destination. */
  transitCountries: CountryCode[];
  departureDate: IsoDate | null;
  /** Null for a one-way trip. */
  returnDate: IsoDate | null;
  transport: TransportMode;
  purpose: MovementPurpose;
  travelers: number;
  dogs: DogProfile[];
}

export const MAX_DOGS = 5;
export const MAX_TRAVELERS = 9;

export function emptyDog(index: number): DogProfile {
  return {
    id: `dog-${index + 1}`,
    birthDate: null,
    microchip: 'unknown-type',
    chipBeforeVaccination: 'unknown',
    rabiesVaccinated: 'unknown',
    rabiesVaccinationDate: null,
    rabiesValidUntil: null,
    rabiesPrimary: 'unknown',
    passport: 'unknown',
    restrictedBreed: 'unknown',
    fciRegistered: 'unknown',
    weightKg: null,
  };
}

/** Nights between the two dates; 0 for a day trip or a one-way trip. */
export function tripNights(trip: Pick<TripPlan, 'departureDate' | 'returnDate'>): number {
  const { departureDate, returnDate } = trip;
  if (!departureDate || !returnDate || returnDate < departureDate) return 0;
  return daysBetween(departureDate, returnDate);
}
