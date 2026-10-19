import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/components/breadcrumb/breadcrumb.component';
import { WINTER_CONTENT } from './winter-copy';
import { WINTER_DATA } from './winter-data';
import { findWinterPage, WINTER_HUB_PATH, WINTER_PAGE_DATA, WinterPage } from './winter-pages';
import { applyWinterSeo, isWinterPageIndexable } from './winter-seo';

/** The blog post on the April 2026 EU rules; the guide links to it rather than repeating it. */
const EU_RULES_POST_PATH = '/blog/nova-eu-pravila-putovanje-pas-april-2026';

/**
 * /putovanje-sa-psom-u-eu: the guide to taking a dog from Serbia into the EU.
 * Its text is the editor's (winter-content.json, `euTravel`); until it is
 * written the page says so, points to the blog post, and stays noindex.
 */
@Component({
  selector: 'app-eu-travel-page',
  imports: [RouterLink, BreadcrumbComponent],
  templateUrl: './eu-travel-page.component.html',
  styleUrl: './winter-page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EuTravelPageComponent {
  readonly page: WinterPage = findWinterPage(inject(ActivatedRoute).snapshot.data[WINTER_PAGE_DATA]) as WinterPage;
  readonly content = WINTER_CONTENT.euTravel;

  readonly h1 = 'Putovanje sa psom u EU iz Srbije';
  readonly breadcrumbs: BreadcrumbItem[] = [{ label: 'Zimovanje sa psom', link: WINTER_HUB_PATH }, { label: 'Putovanje sa psom u EU' }];
  readonly paths = { hub: WINTER_HUB_PATH, rulesPost: EU_RULES_POST_PATH };

  constructor() {
    applyWinterSeo({
      page: this.page,
      headline: this.h1,
      faq: this.content.faq,
      dateModified: null,
      indexable: isWinterPageIndexable(this.page, inject(WINTER_DATA)),
    });
  }
}
