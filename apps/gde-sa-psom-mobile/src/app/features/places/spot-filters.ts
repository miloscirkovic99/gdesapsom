import { SpotSearchParams } from '@gde/shared/data-access';
import { Coordinates } from '@gde/shared/util';

/** What the venue list is filtered by on the Places tab. */
export interface SpotFilters {
  word: string | null;
  townshipIds: number[];
  /** 0 = any (ion-select cannot hold null as an option value). */
  spotTypeId: number;
  petSizeId: number;
  near: Coordinates | null;
  /** Metres, used only with `near`. */
  radius: number;
}

export const NO_SPOT_FILTERS: SpotFilters = {
  word: null,
  townshipIds: [],
  spotTypeId: 0,
  petSizeId: 0,
  near: null,
  radius: 5000,
};

export function activeSpotFilterCount(f: SpotFilters): number {
  return [f.townshipIds.length > 0, f.spotTypeId > 0, f.petSizeId > 0, f.near !== null].filter(Boolean).length;
}

/** `SpotsStore.loadSpots` parameters; `resetOffset` starts a new list instead of appending a page. */
export function toSpotSearchParams(f: SpotFilters, resetOffset: boolean): SpotSearchParams {
  return {
    ops_id: f.townshipIds.length ? f.townshipIds.join(',') : null,
    ugo_id: f.spotTypeId || null,
    sta_id: f.petSizeId || null,
    word: f.word,
    latitude: f.near?.latitude ?? null,
    longitude: f.near?.longitude ?? null,
    radius: f.near ? f.radius : null,
    resetOffset,
  };
}
