import { SITE_LOGO, SITE_ORIGIN } from '../../core/services/seo.service';
import { spotTypeToSchemaType, cleanApiText } from '@gde/shared/util';
import { Post } from '@gde/shared/data-access';

/** The schema.org types under LodgingBusiness, the only ones that define `petsAllowed`. */
const LODGING_TYPES: ReadonlySet<string> = new Set(['Hotel', 'Motel', 'LodgingBusiness']);

/** Chains with several venues are saved with this in place of a street address. */
const MULTIPLE_LOCATIONS = /^više lokacija$/i;

const PUBLISHER = {
  '@type': 'Organization',
  name: 'Gde sa psom',
  url: SITE_ORIGIN,
  logo: SITE_LOGO,
};

/** The spot fields the markup reads; the API rows themselves are untyped. */
export interface SpotSchemaSource {
  iuo_ime?: string | null;
  ugo_ime?: string | null;
  iuo_adressa?: string | null;
  grd_ime?: string | null;
  ops_ime?: string | null;
  sta_ime?: string | null;
  iuo_telefon?: string | null;
  iuo_link_web?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
}

/**
 * schema.org LocalBusiness, or the closest subtype such as CafeOrCoffeeShop,
 * for a spot page. `url` is the spot's page on this site; the venue's own site
 * or social profile goes to `sameAs`. Null when the spot has no name.
 */
export function spotStructuredData(
  spot: SpotSchemaSource,
  page: { url: string; description: string },
): Record<string, unknown> | null {
  const name = cleanApiText(spot.iuo_ime);
  if (!name) return null;

  const type = cleanApiText(spot.ugo_ime);
  const schemaType = (type && spotTypeToSchemaType[type]) || 'LocalBusiness';
  const street = cleanApiText(spot.iuo_adressa);
  const allowedDogs = cleanApiText(spot.sta_ime);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': schemaType,
    name,
    description: page.description,
    url: page.url,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street && !MULTIPLE_LOCATIONS.test(street) ? street : undefined,
      addressLocality: cleanApiText(spot.grd_ime) ?? cleanApiText(spot.ops_ime) ?? undefined,
      addressCountry: 'RS',
    },
    // What every spot on the site has in common. `petsAllowed` only exists on
    // lodging types, so cafés and restaurants state it as an amenity.
    amenityFeature: {
      '@type': 'LocationFeatureSpecification',
      name: allowedDogs ? `Dozvoljeni psi: ${allowedDogs}` : 'Dozvoljeni psi',
      value: true,
    },
  };

  if (LODGING_TYPES.has(schemaType)) data['petsAllowed'] = true;

  const telephone = cleanApiText(spot.iuo_telefon);
  if (telephone) data['telephone'] = telephone;

  const website = toHttpUrl(spot.iuo_link_web);
  if (website) data['sameAs'] = [website];

  const latitude = Number(spot.latitude);
  const longitude = Number(spot.longitude);
  if (spot.latitude && spot.longitude && Number.isFinite(latitude) && Number.isFinite(longitude)) {
    data['geo'] = { '@type': 'GeoCoordinates', latitude, longitude };
  }

  return data;
}

/**
 * The person a post is credited to, or null for posts written from the admin
 * account: "Admin" is not a person's name, so those are the site's own.
 */
export function postAuthorName(autor: string | null | undefined): string | null {
  const name = cleanApiText(autor);
  return name && name.toLowerCase() !== 'admin' ? name : null;
}

/**
 * schema.org BlogPosting for a blog post page. Posts written from the admin
 * account are credited to the site (`postAuthorName`). Null when the post has
 * no title.
 */
export function blogPostingStructuredData(
  post: Post,
  page: { url: string; image: string | null; tags: readonly string[] },
): Record<string, unknown> | null {
  const headline = cleanApiText(post.naslov);
  if (!headline) return null;

  const authorName = postAuthorName(post.autor);
  const author = authorName ? { '@type': 'Person', name: authorName } : PUBLISHER;

  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline,
    url: page.url,
    mainEntityOfPage: page.url,
    datePublished: toIsoDateTime(post.objavljen_u),
    author,
    publisher: PUBLISHER,
    image: page.image ? [page.image] : undefined,
    articleSection: cleanApiText(post.kategorija) ?? undefined,
    keywords: page.tags.length ? page.tags.join(', ') : undefined,
  };
}

/**
 * The API sends MySQL DATETIME ("2026-08-10 23:30:00") without a time zone;
 * schema.org wants ISO 8601. The zone is left out rather than guessed.
 */
function toIsoDateTime(value: string | null | undefined): string | undefined {
  const iso = cleanApiText(value)?.replace(' ', 'T');
  return iso && !Number.isNaN(Date.parse(iso)) ? iso : undefined;
}

/** Absolute http(s) URL; venue links are often saved without a scheme ("instagram.com/kafic"). */
function toHttpUrl(value: string | null | undefined): string | null {
  const text = cleanApiText(value);
  if (!text) return null;

  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(text) ? text : `https://${text}`);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : null;
  } catch {
    return null;
  }
}

/** One step of a breadcrumb trail. */
export interface BreadcrumbCrumb {
  name: string;
  /** Absolute URL of the page the crumb links to; the current page has none. */
  url?: string | null;
}

/**
 * schema.org BreadcrumbList matching the visible trail. The last step is the
 * current page and carries no `item`, as Google's guidelines ask; a single
 * step is not a trail, so that yields null.
 */
export function breadcrumbListStructuredData(
  crumbs: readonly BreadcrumbCrumb[],
): Record<string, unknown> | null {
  const steps = crumbs.filter((crumb) => crumb.name.trim());
  if (steps.length < 2) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: steps.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name.trim(),
      item: index < steps.length - 1 && crumb.url ? crumb.url : undefined,
    })),
  };
}

/** A listing on a hub page. */
export interface CollectionItem {
  name: string;
  /** Absolute URL of the listing's own page. */
  url: string;
}

/**
 * schema.org CollectionPage for a pet-friendly hub (/smestaj, /novi-sad,
 * /novi-sad/kafici): the page, the place it is about, and the listings shown
 * on it as an ItemList. `numberOfItems` is the full count, which can be larger
 * than the listings loaded so far.
 */
export function hubCollectionStructuredData(page: {
  name: string;
  description: string;
  url: string;
  inLanguage: string;
  about: Record<string, unknown> | null;
  total: number | null;
  items: readonly CollectionItem[];
}): Record<string, unknown> | null {
  if (!page.items.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: page.name,
    description: page.description,
    url: page.url,
    inLanguage: page.inLanguage,
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    about: page.about ?? undefined,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: Math.max(page.total ?? 0, page.items.length),
      itemListElement: page.items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    },
  };
}

/**
 * schema.org FAQPage for the questions a page shows. Answers are plain text
 * and must match what is visible on the page. Null when there are none.
 */
export function faqPageStructuredData(
  items: readonly { question: string; answer: string }[],
): Record<string, unknown> | null {
  const entries = items.filter((item) => item.question.trim() && item.answer.trim());
  if (!entries.length) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((item) => ({
      '@type': 'Question',
      name: item.question.trim(),
      acceptedAnswer: { '@type': 'Answer', text: item.answer.trim() },
    })),
  };
}

/** A list page the homepage points to. */
export interface HomeSection {
  name: string;
  /** Site-relative path without a leading slash, e.g. 'all-spots'. */
  path: string;
}

/**
 * schema.org CollectionPage for the homepage: the list pages a visitor can
 * start from. The landing component renders it, so it exists on `/` only;
 * the same block used to ship in index.html and therefore on every page.
 */
export function homeCollectionStructuredData(sections: readonly HomeSection[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    '@id': `${SITE_ORIGIN}/#page`,
    url: `${SITE_ORIGIN}/`,
    name: 'Gde sa psom - pet friendly mesta u Srbiji',
    inLanguage: 'sr-Latn',
    isPartOf: { '@id': `${SITE_ORIGIN}/#website` },
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: sections.map((section, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: section.name,
        url: `${SITE_ORIGIN}/${section.path.replace(/^\/+/, '')}`,
      })),
    },
  };
}
