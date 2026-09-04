import { RouteConstants } from '../../shared/constants/route.constant';
import { CtaType, ItemCategory, SearchCategory, toSearchCategory } from './analytics.taxonomy';

export interface BlogCtaTarget {
  cta_type: CtaType;
  destination_category: ItemCategory | null;
}

/**
 * Classifies a link inside a blog article body for `blog_cta_click`.
 *
 * Blog HTML comes from the CMS as plain anchors, so this is decided from the
 * href alone. Returns `null` for links that are not navigation (mailto:, tel:,
 * anchors), which are not CTAs and must not be tracked.
 *
 * A listing link (`/spots/:id`) cannot know the listing's category or city
 * without another request; that lands on the following `view_item` instead.
 */
export function classifyBlogLink(href: string | null, origin: string): BlogCtaTarget | null {
  if (!href) return null;

  let url: URL;
  try {
    url = new URL(href, origin);
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  if (url.origin !== origin) {
    return { cta_type: CtaType.externalLink, destination_category: null };
  }

  const path = url.pathname.replace(/\/+$/, '') || '/';

  if (path === `/${RouteConstants.allSpots}`) {
    const category = toSearchCategory(url.searchParams.get('spotType'));
    return {
      cta_type: CtaType.categoryLink,
      destination_category: category === SearchCategory.all ? null : category,
    };
  }
  if (path === `/${RouteConstants.petParks}`) {
    return { cta_type: CtaType.categoryLink, destination_category: ItemCategory.park };
  }
  if (path === `/${RouteConstants.vet_clinics}`) {
    return { cta_type: CtaType.categoryLink, destination_category: ItemCategory.veterinary };
  }
  if (/^\/spots\/[^/]+$/.test(path) && path !== `/${RouteConstants.addSpot}`) {
    return { cta_type: CtaType.listingLink, destination_category: null };
  }

  return { cta_type: CtaType.internalLink, destination_category: null };
}
