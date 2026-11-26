import type { Park, PetShopCursor, PetShopListItem, Spot, VetClinic } from '@gde/shared/data-access';
import {
  cleanApiText,
  descriptionToKeyMapSpot,
  foldPlaceName,
  googleMapsDirectionsUrl,
  googleMapsSearchUrl,
  parseCoordinates,
} from '@gde/shared/util';
import type { CategoryId, DogSize, PlaceRef } from '../domain/query.models';

/**
 * Who a venue lets in (`starost`), read from its name so it does not depend
 * on the lookup ids: "Mali pas", "Mali pas i štenci većih rasa do 5 meseci
 * starosti", "Svi psi".
 */
export type DogRule = 'small' | 'small-puppies' | 'all';

export function dogRuleOf(spot: Pick<Spot, 'sta_ime'>): DogRule | null {
  const name = foldPlaceName(spot.sta_ime);
  if (!name) return null;
  if (name.startsWith('svi')) return 'all';
  if (name.includes('sten')) return 'small-puppies';
  if (name.startsWith('mal')) return 'small';
  return null;
}

/**
 * Whether the rule admits the dog. An unknown rule admits no one: the
 * assistant never says a venue takes a dog it has no data about.
 */
export function admitsDog(rule: DogRule | null, size: DogSize): boolean {
  if (!rule) return false;
  if (size === 'small') return true;
  if (size === 'puppy') return rule === 'small-puppies' || rule === 'all';
  return rule === 'all';
}

/** "sa baštom" → true, "bez bašte" → false, anything else unknown. */
export function gardenOf(spot: Pick<Spot, 'bas_naziv'>): boolean | null {
  const name = foldPlaceName(spot.bas_naziv);
  if (name.startsWith('sa bast')) return true;
  if (name.startsWith('bez bast')) return false;
  return null;
}

export type ResultKind = 'spot' | 'park' | 'vet' | 'shop';

/** One place in a reply: always a row from our own database, never text from the AI. */
export interface PlaceResult {
  key: string;
  kind: ResultKind;
  name: string;
  /** Translation key of the venue type ("cafe", "hotel"); spots only. */
  typeKey: string | null;
  address: string | null;
  /** "Vračar, Beograd". */
  area: string | null;
  /** A data URL or a site asset; null for a placeholder icon. */
  image: string | null;
  dogs: DogRule | null;
  garden: boolean | null;
  distanceM: number | null;
  /** Router commands of the place's page on the site. */
  link: string[] | null;
  /** Directions (with coordinates) or a map search by name and address. */
  mapsUrl: string | null;
  phone: string | null;
  /** GA4 `venue_slug`, as the list pages send it. */
  slug: string;
}

function area(...parts: (string | null | undefined)[]): string | null {
  const names = [...new Set(parts.map(cleanApiText).filter((part): part is string => !!part))];
  return names.length ? names.join(', ') : null;
}

function searchUrl(...parts: (string | null | undefined)[]): string | null {
  const query = parts.map(cleanApiText).filter(Boolean).join(' ');
  return query ? googleMapsSearchUrl(query) : null;
}

export function fromSpot(spot: Spot): PlaceResult {
  const name = cleanApiText(spot.iuo_ime) ?? '';
  const address = cleanApiText(spot.iuo_adressa);
  const coordinates = parseCoordinates(spot.latitude, spot.longitude);
  const distance = Number(spot.distance_m);
  return {
    key: `spot-${spot.iuo_id}`,
    kind: 'spot',
    name,
    typeKey: descriptionToKeyMapSpot[spot.ugo_ime] ?? null,
    address,
    area: area(spot.ops_ime, spot.grd_ime),
    image: cleanApiText(spot.iuo_slika_base64),
    dogs: dogRuleOf(spot),
    garden: gardenOf(spot),
    distanceM: spot.distance_m != null && Number.isFinite(distance) ? distance : null,
    link: ['/spots', String(spot.iuo_id)],
    mapsUrl: coordinates ? googleMapsDirectionsUrl(coordinates) : searchUrl(name, address, spot.grd_ime),
    phone: cleanApiText(spot.iuo_telefon),
    slug: `spot-${spot.iuo_id}`,
  };
}

export function fromPark(park: Park): PlaceResult {
  const name = cleanApiText(park.par_ime) ?? '';
  return {
    key: `park-${park.par_id}`,
    kind: 'park',
    name,
    typeKey: null,
    address: cleanApiText(park.par_lokacija),
    area: area(park.ops_ime, park.grd_ime),
    image: cleanApiText(park.iuo_slika_base64) ?? 'assets/park.jpg',
    dogs: null,
    garden: null,
    distanceM: null,
    link: null,
    mapsUrl: searchUrl(park.par_lokacija, park.ops_ime, park.grd_ime) ?? searchUrl(name, park.grd_ime),
    phone: null,
    slug: `park-${park.par_id}`,
  };
}

export function fromVet(clinic: VetClinic): PlaceResult {
  const name = cleanApiText(clinic.vetc_naziv) ?? '';
  const address = cleanApiText(clinic.vetc_adresa);
  return {
    key: `vet-${clinic.vetc_id}`,
    kind: 'vet',
    name,
    typeKey: null,
    address,
    area: area(clinic.ops_ime, clinic.grd_ime),
    image: null,
    dogs: null,
    garden: null,
    distanceM: null,
    link: null,
    mapsUrl: searchUrl(name, address, clinic.grd_ime),
    phone: cleanApiText(clinic.vetc_telefon),
    slug: `vet-${clinic.vetc_id}`,
  };
}

export function fromShop(shop: PetShopListItem): PlaceResult {
  const coordinates = parseCoordinates(shop.latitude, shop.longitude);
  return {
    key: `shop-${shop.id}`,
    kind: 'shop',
    name: shop.name,
    typeKey: null,
    address: cleanApiText(shop.address),
    area: area(shop.townshipName, shop.cityName),
    image: null,
    dogs: null,
    garden: null,
    distanceM: shop.distanceM,
    link: ['/pet-shops', shop.slug],
    mapsUrl: coordinates ? googleMapsDirectionsUrl(coordinates) : searchUrl(shop.name, shop.address, shop.cityName),
    phone: cleanApiText(shop.phone),
    slug: shop.slug,
  };
}

/** Where a search ran, for the reply's title. */
export type SearchScope =
  | { kind: 'place'; place: PlaceRef }
  | { kind: 'near'; radius: number }
  | { kind: 'serbia' };

/** Paging state of a group, plain data so a conversation can be saved and restored. */
export type GroupCursor =
  | { kind: 'spots'; sources: { typeId: number | null; offset: number; total: number }[] }
  | { kind: 'parks'; offset: number }
  | { kind: 'vets'; offset: number; total: number; cityId: number | null; townshipIds: number[] | null }
  | { kind: 'shops'; cursor: PetShopCursor };

/** A page on the site with the full list. */
export interface SiteLink {
  path: string;
  queryParams?: Record<string, string>;
}

/** The results of one category (or of every venue type, `category: null`). */
export interface ResultGroup {
  category: CategoryId | null;
  scope: SearchScope;
  items: PlaceResult[];
  /** The township had none, so the search covers its city. */
  widened: boolean;
  /** Null when there is nothing more to load. */
  cursor: GroupCursor | null;
  link: SiteLink | null;
}
