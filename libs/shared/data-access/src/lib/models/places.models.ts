/**
 * Row shapes of the legacy (pre-catalog) API: venues, parks, vet clinics and
 * the lookups behind their filters.
 *
 * Field names are the database columns the handlers in apps/api/v2 select.
 * The legacy tables have no schema in the repo, so types come from that SQL
 * and from how the portal reads the rows; fields that only some endpoints
 * return are optional.
 */

/** `{ id, ime }` lookup row: townships, venue types, allowed pet sizes, garden types. */
export interface IdName {
  id: number;
  /** Serbian label; map it to a translation key with the `descriptionToKeyMap*` helpers. */
  ime: string;
}

/**
 * A municipality (`opstina.ops_id` / `ops_ime`), from `township`. The full list
 * carries each township's city, so filter it by `grd_id` rather than calling
 * `township/:grd_id` (that handler is not deployed on either API host).
 */
export interface Township extends IdName {
  grd_id?: number;
  city_name?: string;
}
/** Venue type (`ugo_objekat`): Kafić, Restoran, Hotel, ... */
export type SpotType = IdName;
/** Which dogs are allowed (`starost`): Svi psi, Mali pas, ... */
export type AllowedPetType = IdName;
/** Garden or not (`basta`). */
export type GardenType = IdName;

export interface City {
  grd_id: number;
  grd_ime: string;
  drz_id?: number;
  drz_naziv?: string;
}

export interface Country {
  drz_id: number;
  drz_naziv: string;
}

/**
 * A pet-friendly venue (`info_ug_obj` joined with its lookups), as returned by
 * `pet-friendly-spots/search-query`, `pet-friendly-spots/all/:id` and, with
 * fewer columns, `pet-friendly-spots/random`.
 */
export interface Spot {
  iuo_id: number;
  iuo_ime: string;
  iuo_adressa: string;
  /** Website or social profile; may be empty. */
  iuo_link_web: string | null;
  /** Outside photo as a data URL. */
  iuo_slika_base64: string | null;
  /** Inside photo as a data URL. */
  iuo_slika_base64_unutra: string | null;
  iuo_telefon: string | null;
  /** Some rows hold the literal string "null"; read it through `cleanApiText`. */
  iuo_opis?: string | null;
  /** Stored as text; parse before use. Missing from `random`. */
  latitude?: string | number | null;
  longitude?: string | number | null;
  /** Metres from the searched point; only on searches that sent a location. */
  distance_m?: number;
  ops_id?: number;
  ugo_id?: number;
  sta_id?: number;
  bas_id?: number;
  ops_ime: string;
  grd_ime: string;
  ugo_ime: string;
  sta_ime: string;
  bas_naziv: string;
  /** Only on `all/:id`. */
  sta_meseci?: number | null;
}

/** Filters for `SpotsStore.loadSpots`. `resetOffset: true` starts a new list instead of appending a page. */
export interface SpotSearchParams {
  /** Comma-separated township ids. */
  ops_id: string | null;
  ugo_id: string | number | null;
  sta_id: string | number | null;
  word: string | null;
  resetOffset?: boolean | null;
  latitude: number | null;
  longitude: number | null;
  /** Metres; the API defaults to 2000 when a location is sent without one. */
  radius: number | null;
}

/** Body of `pet-friendly-spots/pending` (a visitor's suggestion, reviewed in admin). */
export interface SuggestSpotPayload {
  iuo_ime: string;
  iuo_adressa: string;
  iuo_link_web: string;
  /** Data URLs. */
  iuo_slika: string | null;
  iuo_slika_unutra: string | null;
  iuo_telefon: string;
  ops_id: number;
  ugo_id: number;
  sta_id: number;
  bas_id: number;
  iuo_opis: string;
}

/** A dog park (`parkovi` joined with township and city), from `pet-friendly-parks/list`. */
export interface Park {
  par_id: number;
  par_ime: string;
  par_lokacija: string;
  par_opis: string | null;
  par_accepted: number;
  par_declined?: number | null;
  /** `par_slika` under the spot column name, so parks render in the spot card. Usually null. */
  iuo_slika_base64: string | null;
  ops_id: number;
  ops_ime: string;
  grd_id: number;
  grd_ime: string;
}

/** Body of `pet-friendly-parks/create` (POST: a visitor's suggestion). */
export interface SuggestParkPayload {
  par_ime: string;
  par_lokacija: string;
  ops_id: number;
  par_opis: string;
  par_accepted: 0 | 1;
}

/** A veterinary clinic, from `veterinary-clinics/list`. */
export interface VetClinic {
  vetc_id: number;
  vetc_naziv: string;
  vetc_telefon: string | null;
  vetc_adresa: string | null;
  grd_id: number;
  grd_ime: string;
  /** The township join is optional. */
  ops_id: number | null;
  ops_ime: string | null;
  /** Read by the portal, but `veterinary-clinics/list` does not select it yet. */
  vetc_logo?: string | null;
}

/** Filters for `VetClinicsStore.loadVetclinics`. */
export interface VetClinicSearchParams {
  /** Comma-separated township ids. */
  ops_id?: string | null;
  grd_id?: number | string | null;
  word?: string | null;
  resetOffset?: boolean;
}
