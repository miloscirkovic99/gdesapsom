import { DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, take } from 'rxjs';
import { SeoService, SITE_ORIGIN } from '../../core/services/seo.service';
import { articleStructuredData, faqPageStructuredData } from '../../shared/utils/structured-data';
import type { FaqItem } from './winter-copy';
import { WINTER_CONTENT } from './winter-copy';
import type { WinterSnapshot } from './winter-data';
import { WINTER_DESTINATIONS, type WinterPage } from './winter-pages';

const ARTICLE_ID = 'winter-article';
const FAQ_ID = 'winter-faq';

/**
 * Whether a winter page has enough of its own content to be indexed. Until it
 * does it renders, but as noindex, and tools/generate-sitemap.mjs leaves it
 * out by the same rule (keep the two in step):
 * - a destination: at least one stay that takes dogs;
 * - the hub: at least one indexable destination;
 * - the EU guide: at least one written section.
 */
export function isWinterPageIndexable(page: WinterPage, snapshot: WinterSnapshot): boolean {
  const hasStays = (slug: string) => (snapshot.destinations[slug]?.stays.length ?? 0) > 0;
  switch (page.kind) {
    case 'destination':
      return !!page.destination && hasStays(page.destination.slug);
    case 'hub':
      return WINTER_DESTINATIONS.some((destination) => hasStays(destination.slug));
    case 'euTravel':
      return WINTER_CONTENT.euTravel.sections.length > 0;
  }
}

/**
 * Article and FAQPage JSON-LD of a winter page, plus noindex while the page
 * is not ready. Runs on the server as well, so the prerendered HTML carries
 * all of it. Must be called from a constructor.
 *
 * Breadcrumbs publish their own BreadcrumbList (BreadcrumbComponent).
 */
export function applyWinterSeo(options: {
  page: WinterPage;
  headline: string;
  faq: readonly FaqItem[];
  dateModified: string | null;
  indexable: boolean;
  about?: Record<string, unknown> | null;
}): void {
  const seo = inject(SeoService);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);
  const { page } = options;

  const article = articleStructuredData({
    headline: options.headline,
    description: page.description,
    url: `${SITE_ORIGIN}${page.path}`,
    dateModified: options.dateModified,
    about: options.about,
  });
  if (article) seo.setStructuredData(ARTICLE_ID, article);

  const faq = faqPageStructuredData(options.faq);
  if (faq) seo.setStructuredData(FAQ_ID, faq);

  if (!options.indexable) {
    // AppComponent writes the route's robots tag on NavigationEnd, which comes
    // after this constructor; overrule it once that has happened.
    router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
        takeUntilDestroyed(destroyRef),
      )
      .subscribe(() => seo.update({ title: page.title, description: page.description, path: page.path, noindex: true }));
  }

  destroyRef.onDestroy(() => {
    seo.clearStructuredData(ARTICLE_ID);
    seo.clearStructuredData(FAQ_ID);
  });
}
