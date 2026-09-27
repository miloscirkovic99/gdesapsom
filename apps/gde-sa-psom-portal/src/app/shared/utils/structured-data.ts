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
 * schema.org BlogPosting for a blog post page. Posts written from the admin
 * account are credited to the site, since "Admin" is not a person's name.
 * Null when the post has no title.
 */
export function blogPostingStructuredData(
  post: Post,
  page: { url: string; image: string | null; tags: readonly string[] },
): Record<string, unknown> | null {
  const headline = cleanApiText(post.naslov);
  if (!headline) return null;

  const authorName = cleanApiText(post.autor);
  const author =
    authorName && authorName.toLowerCase() !== 'admin'
      ? { '@type': 'Person', name: authorName }
      : PUBLISHER;

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
