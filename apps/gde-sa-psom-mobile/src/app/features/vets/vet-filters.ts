import { VetClinicSearchParams } from '@gde/shared/data-access';

/** What the clinic list is filtered by on the Vets tab. */
export interface VetFilters {
  word: string | null;
  /** 0 = every city. */
  cityId: number;
  townshipIds: number[];
}

export const NO_VET_FILTERS: VetFilters = { word: null, cityId: 0, townshipIds: [] };

/** Active filters as the website reports them in `filter_applied`. */
export function vetFilterKeys(f: VetFilters): string[] {
  return [...(f.townshipIds.length ? ['ops_id'] : []), ...(f.cityId ? ['grd_id'] : [])];
}

/** `VetClinicsStore.loadVetclinics` parameters. */
export function toVetSearchParams(f: VetFilters, resetOffset: boolean): VetClinicSearchParams {
  return {
    word: f.word,
    grd_id: f.cityId || null,
    ops_id: f.townshipIds.length ? f.townshipIds.join(',') : null,
    resetOffset,
  };
}
