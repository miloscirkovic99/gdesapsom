import { ChangeDetectionStrategy, Component, effect, inject, input, OnDestroy } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Params, Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { combineLatest, map, of, switchMap } from 'rxjs';
import { SeoService, SITE_ORIGIN } from '../../../core/services/seo.service';
import { breadcrumbListStructuredData } from '../../utils/structured-data';

export interface BreadcrumbItem {
  /** Literal text, e.g. a venue name. */
  label?: string | null;
  /** Translation key, for section names. */
  labelKey?: string;
  /** Router commands; the last item is the current page and renders without a link. */
  link?: string | unknown[];
  queryParams?: Params;
}

const STRUCTURED_DATA_ID = 'breadcrumb';

/**
 * Visible breadcrumb trail plus the matching schema.org BreadcrumbList.
 *
 * "Početna" is added in front; the last item is the current page. The JSON-LD
 * is rebuilt when translations load or the language changes, and removed when
 * the page is left, so a trail never outlives its page.
 */
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, TranslocoModule],
  template: `
    <nav [attr.aria-label]="'breadcrumb' | transloco" class="text-sm text-base-content/60">
      <ol class="flex flex-wrap items-center gap-1.5">
        <li><a routerLink="/" class="link link-hover">{{ 'home' | transloco }}</a></li>
        @for (item of items(); track $index; let last = $last) {
          <li aria-hidden="true">/</li>
          @if (!last && item.link) {
            <li>
              <a [routerLink]="item.link" [queryParams]="item.queryParams ?? null" class="link link-hover">
                {{ item.labelKey ? (item.labelKey | transloco) : item.label }}
              </a>
            </li>
          } @else {
            <li
              class="text-base-content/80 truncate max-w-[60vw] sm:max-w-none"
              [attr.aria-current]="last ? 'page' : null"
            >
              {{ item.labelKey ? (item.labelKey | transloco) : item.label }}
            </li>
          }
        }
      </ol>
    </nav>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent implements OnDestroy {
  /** The trail after "Početna", current page last. */
  readonly items = input.required<readonly BreadcrumbItem[]>();

  readonly #router = inject(Router);
  readonly #seo = inject(SeoService);
  readonly #transloco = inject(TranslocoService);

  /** Items paired with their resolved names, so the two never go out of step. */
  readonly #trail = toSignal(
    toObservable(this.items).pipe(
      switchMap((items) =>
        combineLatest([
          this.#transloco.selectTranslate<string>('home'),
          ...items.map((item) =>
            item.labelKey ? this.#transloco.selectTranslate<string>(item.labelKey) : of(item.label ?? ''),
          ),
        ]).pipe(map((names) => ({ items, names }))),
      ),
    ),
  );

  constructor() {
    effect(() => {
      const trail = this.#trail();
      if (!trail) return;

      const [home, ...names] = trail.names;
      const data = breadcrumbListStructuredData([
        { name: home, url: `${SITE_ORIGIN}/` },
        ...trail.items.map((item, index) => ({ name: names[index], url: this.#absoluteUrl(item) })),
      ]);

      if (data) this.#seo.setStructuredData(STRUCTURED_DATA_ID, data);
      else this.#seo.clearStructuredData(STRUCTURED_DATA_ID);
    });
  }

  ngOnDestroy(): void {
    this.#seo.clearStructuredData(STRUCTURED_DATA_ID);
  }

  #absoluteUrl(item: BreadcrumbItem): string | null {
    if (!item.link) return null;
    const commands = Array.isArray(item.link) ? item.link : [item.link];
    const tree = this.#router.createUrlTree(commands, { queryParams: item.queryParams });
    return `${SITE_ORIGIN}${this.#router.serializeUrl(tree)}`;
  }
}
