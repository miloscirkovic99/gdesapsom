import { InjectionToken } from '@angular/core';
import snapshot from './winter-data.json';

/**
 * What the winter pages know about each destination: a snapshot written by
 * `tools/fetch-winter-data.mjs` before the build, so the prerendered HTML
 * already carries the lists.
 *
 * Every value comes from the database. A field the database has as NULL is
 * null here and is not shown; there are no defaults and nothing is inferred.
 */

export type DogSize = 'mali' | 'srednji' | 'veliki' | 'svi';

export interface WinterDogFee {
  amount: number;
  currency: 'RSD' | 'EUR';
  /** Per night or once per stay. */
  per: 'noc' | 'boravak';
}

export interface WinterStay {
  /** `info_ug_obj.iuo_id`: the venue page is /spots/:id. */
  id: number;
  name: string;
  address: string | null;
  dogFee: WinterDogFee | null;
  maxDogs: number | null;
  dogMayStayAlone: boolean | null;
  maxDogSize: DogSize | null;
  affiliateUrl: string | null;
}

export interface WinterRestaurant {
  id: number;
  name: string;
  address: string | null;
}

export interface WinterTrail {
  id: number;
  name: string;
  lengthKm: number | null;
  description: string | null;
}

export interface WinterLift {
  dogsAllowed: boolean | null;
  /** 'YYYY-MM-DD' of the last check. */
  checkedAt: string | null;
}

export interface WinterVet {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  /** From the destination's centre, rounded to 0.1 km. */
  distanceKm: number | null;
}

export interface WinterDestinationData {
  stays: WinterStay[];
  /** Only restaurants where dogs may come inside. */
  restaurants: WinterRestaurant[];
  trails: WinterTrail[];
  gondola: WinterLift;
  skiLifts: WinterLift;
  vet: WinterVet | null;
}

export interface WinterSnapshot {
  /** 'YYYY-MM-DD' the snapshot was taken; null until the first run of the script. */
  generatedAt: string | null;
  destinations: Record<string, WinterDestinationData>;
}

export const EMPTY_DESTINATION: WinterDestinationData = {
  stays: [],
  restaurants: [],
  trails: [],
  gondola: { dogsAllowed: null, checkedAt: null },
  skiLifts: { dogsAllowed: null, checkedAt: null },
  vet: null,
};

export const WINTER_SNAPSHOT = snapshot as WinterSnapshot;

/** The snapshot the pages render; tests provide their own. */
export const WINTER_DATA = new InjectionToken<WinterSnapshot>('WINTER_DATA', {
  providedIn: 'root',
  factory: () => WINTER_SNAPSHOT,
});

export function destinationData(slug: string, data: WinterSnapshot): WinterDestinationData {
  return data.destinations[slug] ?? EMPTY_DESTINATION;
}
