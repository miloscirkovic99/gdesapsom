import { Route } from '@angular/router';
import { foldPlaceName, LocalizedName } from '@gde/shared/util';
import taxonomy from './pet-friendly-taxonomy.json';

/**
 * The pet-friendly hub pages: one URL per search intent.
 *
 *   /smestaj, /kafici, ...       national category hub ("pet friendly smeštaj srbija")
 *   /beograd, /novi-sad          city hub ("pet friendly novi sad")
 *   /novi-sad/kafici, ...        city × category ("pet friendly kafići novi sad")
 *
 * Before these existed every such query could only land on /all-spots, whose
 * `?spotType=` filters canonicalise to the unfiltered list, so the site had no
 * page about accommodation or about Novi Sad for Google to rank.
 *
 * Which pages exist comes from pet-friendly-taxonomy.json, which
 * tools/generate-sitemap.mjs reads as well, so the router and the sitemap
 * cannot drift apart. This file adds the labels and the Serbian <title> and
 * description of each page; it is imported by eager code (routes, footer), so
 * the long page copy lives in pet-friendly-copy.ts, inside the lazy chunk.
 *
 * A new top-level path also needs a line in the SPA fallback list of the root
 * .htaccess, or the host answers it with a 404 (see docs/seo/README.md).
 */

export interface PetFriendlyCategory {
  slug: string;
  /** `ugo_objekat.ugo_ime` values that belong to the category. */
  spotTypes: readonly string[];
  /** "Kafići": navigation and breadcrumb label. */
  label: LocalizedName;
  /** "Pet friendly kafići": link text for the national hub. */
  hubLabel: LocalizedName;
}

export interface PetFriendlyCity {
  slug: string;
  /** `grad.grd_ime` values of the city, matched without case or diacritics. */
  names: readonly string[];
  name: LocalizedName;
  /** "u Novom Sadu" / "in Novi Sad". */
  locative: LocalizedName;
  /** "Pet friendly Novi Sad": link text for the city hub. */
  hubLabel: LocalizedName;
}

export type PetFriendlyPageKind = 'category' | 'city' | 'cityCategory';

export interface PetFriendlyPage {
  kind: PetFriendlyPageKind;
  /** Site-relative URL, e.g. '/novi-sad/kafici'. */
  path: string;
  city: PetFriendlyCity | null;
  category: PetFriendlyCategory | null;
  /** With fewer listings than this the page is marked noindex and left out of the sitemap. */
  minListingsToIndex: number;
  /** Serbian, like every other <title> on the site: crawlers get the Serbian version. */
  title: string;
  description: string;
}

/** Route data key that carries the page path to PetFriendlyPageComponent. */
export const PET_FRIENDLY_PAGE_DATA = 'petFriendlyPage';

const TITLE_SUFFIX = ' | Gde sa psom';

interface CategoryInfo {
  label: LocalizedName;
  hubLabel: LocalizedName;
  nationalTitle: string;
  nationalDescription: string;
  cityTitle(city: PetFriendlyCity): string;
  cityDescription(city: PetFriendlyCity): string;
}

const CATEGORY_INFO: Readonly<Record<string, CategoryInfo>> = {
  kafici: {
    label: { nameSr: 'Kafići', nameEn: 'Cafés' },
    hubLabel: { nameSr: 'Pet friendly kafići', nameEn: 'Pet-friendly cafés' },
    nationalTitle: 'Pet Friendly Kafići u Srbiji – Kafići u Koje Možete sa Psom',
    nationalDescription:
      'Pet friendly kafići u Beogradu, Novom Sadu i širom Srbije: kafići u koje možete sa psom, sa podacima o bašti i veličini pasa, adresom i kontaktom.',
    cityTitle: (city) => `Pet Friendly Kafići ${city.name.nameSr} – Kafići u Koje Možete sa Psom`,
    cityDescription: (city) =>
      `Pet friendly kafići ${city.locative.nameSr}: lista kafića koji primaju pse, sa podacima o bašti i veličini pasa, adresom, kontaktom i lokacijom na mapi.`,
  },
  restorani: {
    label: { nameSr: 'Restorani', nameEn: 'Restaurants' },
    hubLabel: { nameSr: 'Pet friendly restorani', nameEn: 'Pet-friendly restaurants' },
    nationalTitle: 'Pet Friendly Restorani u Srbiji – Restorani u Koje Možete sa Psom',
    nationalDescription:
      'Pet friendly restorani i splavovi u Beogradu, Novom Sadu i širom Srbije: gde na ručak sa psom, koje veličine pasa su dobrodošle i da li postoji bašta.',
    cityTitle: (city) => `Pet Friendly Restorani ${city.name.nameSr} – Restorani u Koje Možete sa Psom`,
    cityDescription: (city) =>
      `Pet friendly restorani ${city.locative.nameSr}: restorani i splavovi koji primaju pse, sa podacima o bašti i veličini pasa, adresom i kontaktom.`,
  },
  barovi: {
    label: { nameSr: 'Barovi i pabovi', nameEn: 'Bars and pubs' },
    hubLabel: { nameSr: 'Pet friendly barovi i pabovi', nameEn: 'Pet-friendly bars and pubs' },
    nationalTitle: 'Pet Friendly Barovi i Pabovi u Srbiji – Na Piće sa Psom',
    nationalDescription:
      'Pet friendly barovi i pabovi u Beogradu, Novom Sadu i širom Srbije: gde na piće sa psom, koje veličine pasa su dobrodošle i da li postoji bašta.',
    cityTitle: (city) => `Pet Friendly Barovi ${city.name.nameSr} – Barovi i Pabovi sa Psom`,
    cityDescription: (city) =>
      `Pet friendly barovi i pabovi ${city.locative.nameSr}: gde na piće sa psom, koje veličine pasa su dobrodošle i da li postoji bašta, uz adresu i kontakt.`,
  },
  smestaj: {
    label: { nameSr: 'Smeštaj', nameEn: 'Places to stay' },
    hubLabel: { nameSr: 'Pet friendly smeštaj', nameEn: 'Pet-friendly places to stay' },
    nationalTitle: 'Pet Friendly Smeštaj u Srbiji – Hoteli i Apartmani za Pse',
    nationalDescription:
      'Pet friendly smeštaj u Srbiji: hoteli, apartmani i moteli koji primaju pse i kućne ljubimce. Proverite pravila za ljubimce, adresu i kontakt pre rezervacije.',
    cityTitle: (city) => `Pet Friendly Smeštaj ${city.name.nameSr} – Hoteli i Apartmani za Pse`,
    cityDescription: (city) =>
      `Pet friendly smeštaj ${city.locative.nameSr}: hoteli, apartmani i moteli koji primaju pse. Proverite pravila za ljubimce, adresu i kontakt pre rezervacije.`,
  },
};

interface CityInfo {
  name: LocalizedName;
  locative: LocalizedName;
  title: string;
  description: string;
}

const CITY_INFO: Readonly<Record<string, CityInfo>> = {
  beograd: {
    name: { nameSr: 'Beograd', nameEn: 'Belgrade' },
    locative: { nameSr: 'u Beogradu', nameEn: 'in Belgrade' },
    title: 'Pet Friendly Beograd – Kafići, Restorani i Smeštaj sa Psom',
    description:
      'Gde sa psom u Beogradu? Pet friendly kafići, restorani, barovi, splavovi i smeštaj koji primaju pse, uz parkove za pse i veterinare na jednom mestu.',
  },
  'novi-sad': {
    name: { nameSr: 'Novi Sad', nameEn: 'Novi Sad' },
    locative: { nameSr: 'u Novom Sadu', nameEn: 'in Novi Sad' },
    title: 'Pet Friendly Novi Sad – Kafići, Restorani i Smeštaj sa Psom',
    description:
      'Gde sa psom u Novom Sadu? Pet friendly kafići, restorani, barovi i smeštaj koji primaju pse, uz parkove za pse i veterinare na jednom mestu.',
  },
};

function requireInfo<T>(table: Readonly<Record<string, T>>, slug: string, what: string): T {
  const info = table[slug];
  if (!info) throw new Error(`pet-friendly-taxonomy.json: no ${what} info for "${slug}" in pet-friendly-pages.ts`);
  return info;
}

export const PET_FRIENDLY_CATEGORIES: readonly PetFriendlyCategory[] = taxonomy.categories.map((entry) => {
  const info = requireInfo(CATEGORY_INFO, entry.slug, 'category');
  return { slug: entry.slug, spotTypes: entry.spotTypes, label: info.label, hubLabel: info.hubLabel };
});

export const PET_FRIENDLY_CITIES: readonly PetFriendlyCity[] = taxonomy.cities.map((entry) => {
  const info = requireInfo(CITY_INFO, entry.slug, 'city');
  return {
    slug: entry.slug,
    names: entry.names,
    name: info.name,
    locative: info.locative,
    hubLabel: { nameSr: `Pet friendly ${info.name.nameSr}`, nameEn: `Pet-friendly ${info.name.nameEn}` },
  };
});

export function categoryPath(category: PetFriendlyCategory, city?: PetFriendlyCity | null): string {
  return city ? `/${city.slug}/${category.slug}` : `/${category.slug}`;
}

export function cityPath(city: PetFriendlyCity): string {
  return `/${city.slug}`;
}

/** "Kafići u Novom Sadu" / "Cafés in Novi Sad". */
export function cityCategoryLabel(category: PetFriendlyCategory, city: PetFriendlyCity): LocalizedName {
  return {
    nameSr: `${category.label.nameSr} ${city.locative.nameSr}`,
    nameEn: `${category.label.nameEn} ${city.locative.nameEn}`,
  };
}

function buildPages(): PetFriendlyPage[] {
  const limits = taxonomy.minListingsToIndex;
  const pages: PetFriendlyPage[] = [];

  for (const category of PET_FRIENDLY_CATEGORIES) {
    const info = CATEGORY_INFO[category.slug];
    pages.push({
      kind: 'category',
      path: categoryPath(category),
      city: null,
      category,
      minListingsToIndex: limits.category,
      title: info.nationalTitle + TITLE_SUFFIX,
      description: info.nationalDescription,
    });
  }

  for (const city of PET_FRIENDLY_CITIES) {
    const info = CITY_INFO[city.slug];
    pages.push({
      kind: 'city',
      path: cityPath(city),
      city,
      category: null,
      minListingsToIndex: limits.city,
      title: info.title + TITLE_SUFFIX,
      description: info.description,
    });

    for (const category of PET_FRIENDLY_CATEGORIES) {
      const categoryInfo = CATEGORY_INFO[category.slug];
      pages.push({
        kind: 'cityCategory',
        path: categoryPath(category, city),
        city,
        category,
        minListingsToIndex: limits.cityCategory,
        title: categoryInfo.cityTitle(city) + TITLE_SUFFIX,
        description: categoryInfo.cityDescription(city),
      });
    }
  }

  return pages;
}

export const PET_FRIENDLY_PAGES: readonly PetFriendlyPage[] = buildPages();

/** The national hub of a category, for links from other pages; throws on a slug the taxonomy does not have. */
export function nationalHubLink(slug: string): PetFriendlyLink {
  const category = PET_FRIENDLY_CATEGORIES.find((item) => item.slug === slug);
  if (!category) throw new Error(`pet-friendly-taxonomy.json has no category "${slug}"`);
  return { label: category.hubLabel, path: categoryPath(category) };
}

/** The hub of a city, for links from other pages; throws on a slug the taxonomy does not have. */
export function cityHubLink(slug: string): PetFriendlyLink {
  const city = PET_FRIENDLY_CITIES.find((item) => item.slug === slug);
  if (!city) throw new Error(`pet-friendly-taxonomy.json has no city "${slug}"`);
  return { label: city.hubLabel, path: cityPath(city) };
}

/** The national accommodation hub ("pet friendly smeštaj srbija"), linked from the main navigation. */
export const STAYS_HUB_PATH = nationalHubLink('smestaj').path;

export function findPetFriendlyPage(path: string | null | undefined): PetFriendlyPage | null {
  return PET_FRIENDLY_PAGES.find((page) => page.path === path) ?? null;
}

/**
 * One explicit route per page, so a combination that is not in the taxonomy
 * (/novi-sad/teretane, /zemun) falls through to the not-found route instead of
 * rendering an empty hub. Title and description are what AppComponent hands to
 * SeoService on navigation.
 */
export function petFriendlyRoutes(loadComponent: Route['loadComponent']): Route[] {
  return PET_FRIENDLY_PAGES.map((page) => ({
    path: page.path.slice(1),
    loadComponent,
    title: page.title,
    data: { description: page.description, [PET_FRIENDLY_PAGE_DATA]: page.path },
  }));
}

/** The city a `grd_ime` belongs to, if it has a hub. */
export function cityForName(name: string | null | undefined): PetFriendlyCity | null {
  const key = foldPlaceName(name);
  if (!key) return null;
  return PET_FRIENDLY_CITIES.find((city) => city.names.some((cityName) => foldPlaceName(cityName) === key)) ?? null;
}

/** The category a venue type (`ugo_ime`) belongs to, if any. Gyms and "Ostalo" have none. */
export function categoryForSpotType(spotType: string | null | undefined): PetFriendlyCategory | null {
  const key = foldPlaceName(spotType);
  if (!key) return null;
  return (
    PET_FRIENDLY_CATEGORIES.find((category) =>
      category.spotTypes.some((type) => foldPlaceName(type) === key),
    ) ?? null
  );
}

/** A link to one of the hub pages. */
export interface PetFriendlyLink {
  label: LocalizedName;
  path: string;
}

type SpotPlace = { grd_ime?: string | null; ugo_ime?: string | null } | null | undefined;

/**
 * The hubs a venue belongs to, most specific last, as breadcrumb steps: its
 * city, then its category in that city (or the national category when the
 * city has no hub). Empty for a gym in a city without a hub.
 */
export function hubLinksForSpot(spot: SpotPlace): PetFriendlyLink[] {
  const city = cityForName(spot?.grd_ime);
  const category = categoryForSpotType(spot?.ugo_ime);
  const links: PetFriendlyLink[] = [];

  if (city) links.push({ label: city.hubLabel, path: cityPath(city) });
  if (category) {
    links.push(
      city
        ? { label: category.label, path: categoryPath(category, city) }
        : { label: category.hubLabel, path: categoryPath(category) },
    );
  }

  return links;
}

/**
 * The same hubs as `hubLinksForSpot`, most specific first and with labels
 * that stand on their own ("Pet friendly kafići u Novom Sadu"), for the
 * "more places like this" links on a spot page.
 */
export function relatedHubLinksForSpot(spot: SpotPlace): PetFriendlyLink[] {
  const city = cityForName(spot?.grd_ime);
  const category = categoryForSpotType(spot?.ugo_ime);
  const links: PetFriendlyLink[] = [];

  if (category && city) {
    links.push({
      label: {
        nameSr: `${category.hubLabel.nameSr} ${city.locative.nameSr}`,
        nameEn: `${category.hubLabel.nameEn} ${city.locative.nameEn}`,
      },
      path: categoryPath(category, city),
    });
  }
  if (city) links.push({ label: city.hubLabel, path: cityPath(city) });
  if (category) links.push({ label: category.hubLabel, path: categoryPath(category) });

  return links;
}

/** Every city hub, then every national category hub: the footer's link row. */
export function allHubLinks(): PetFriendlyLink[] {
  return [
    ...PET_FRIENDLY_CITIES.map((city) => ({ label: city.hubLabel, path: cityPath(city) })),
    ...PET_FRIENDLY_CATEGORIES.map((category) => ({ label: category.hubLabel, path: categoryPath(category) })),
  ];
}
