/**
 * The planner API (apps/api/lib/planner), as the portal sees it. Field names
 * follow the API, which follows the plan schema in
 * docs/planer-sistemski-prompt.md.
 */

export type PlannerMode = 'dan' | 'zimovanje';
export type DogSize = 'mali' | 'srednji' | 'veliki';

export interface DanParams {
  mode: 'dan';
  grad: string;
  /** 'YYYY-MM-DD'. */
  datum: string;
  velicina: DogSize;
  energija: 'niska' | 'srednja' | 'visoka';
  osetljiv_na_vrucinu: boolean;
  tip_dana: 'opusten' | 'aktivan' | 'mesovit';
}

export interface ZimovanjeParams {
  mode: 'zimovanje';
  destinacija: string;
  broj_noci: number;
  velicina: DogSize;
  dlaka: 'kratka' | 'srednja' | 'duga';
  neko_skija: boolean;
  pas_sme_sam: boolean;
}

/** What the form sends. The dog's name is not part of it, by design. */
export type PlannerParams = DanParams | ZimovanjeParams;

export interface PlanStop {
  /** 'HH:MM'. */
  vreme: string;
  lokacija_id: number;
  zasto: string;
  /** May contain {{ime}}, filled in by the browser. */
  savet_za_psa: string;
}

export interface DanPlan {
  naslov: string;
  stanice: PlanStop[];
  napomene: string[];
}

export interface ZimovanjePlan {
  naslov: string;
  smestaj: { lokacija_id: number; zasto: string }[];
  dani: { dan: number; stanice: PlanStop[] }[];
  veterinar_id: number | null;
  napomene: string[];
}

export type PlaceCategory = 'kafic' | 'restoran' | 'bar' | 'smestaj' | 'park' | 'staza' | 'veterinar';

/** A place the plan uses, as stored in the database. Null means unknown and is not shown. */
export interface PlannerPlace {
  id: number;
  naziv: string;
  kategorija: PlaceCategory;
  adresa: string | null;
  kvart: string | null;
  lat: number | null;
  lng: number | null;
  /** Site-relative page of the place (/spots/123), when it has one. */
  url: string | null;
  affiliate_url: string | null;
  doplata_za_psa?: { amount: number; currency: 'RSD' | 'EUR'; per: 'noc' | 'boravak' } | null;
  max_pasa?: number | null;
  pas_sme_sam_u_sobi?: boolean | null;
  telefon?: string | null;
}

export interface WeatherAttribution {
  text: string;
  url: string;
  license: string;
  license_url: string;
}

export interface PlannerResult {
  plan_id: string;
  mode: PlannerMode;
  plan: DanPlan | ZimovanjePlan;
  /** Every place the plan mentions, keyed by lokacija_id. */
  places: Record<string, PlannerPlace>;
  source: 'ai' | 'rules';
  weather_attribution: WeatherAttribution | null;
  /** Plans the device has left this week; only on a newly made plan. */
  remaining?: number;
  /** When the next plan is possible, if none is left (ISO 8601). */
  next_at?: string | null;
}

export type LimitReason = 'device' | 'network' | 'cooldown';

/** Body of a 429 from POST /planner. */
export interface PlannerLimit {
  reason: LimitReason;
  next_at: string | null;
  retry_after?: number;
}

/** Which entry "Zameni" replaces. */
export interface SwapTarget {
  section?: 'stanice' | 'smestaj';
  /** Day number in a winter plan. */
  day?: number;
  index: number;
  /** Places already swapped away, so the next swap moves on. */
  exclude?: number[];
}

export const isWinterPlan = (plan: DanPlan | ZimovanjePlan): plan is ZimovanjePlan => 'dani' in plan;
