import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '@gde/shared/util';

/**
 * The "**" route, and what a detail page shows when the API has no such entity.
 *
 * UI only: the route data (`noindex: true`) or the host page is what marks the
 * URL noindex through SeoService. The SPA cannot change the HTTP status, so the
 * tag is what keeps these URLs out of the index; `.htaccess` adds the real 404
 * for paths outside the app's routes.
 */
@Component({
  selector: 'app-not-found',
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule],
  templateUrl: './not-found.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFoundComponent {
  /** Detail pages narrow the message ("Mesto nije pronađeno"). */
  readonly titleKey = input('not_found_title');
  readonly textKey = input('not_found_text');

  readonly query = new FormControl('', { nonNullable: true });

  /** The main sections, so the page passes visitors (and crawlers) somewhere useful. */
  readonly sections = [
    { labelKey: 'breadcrumb_spots', path: RouteConstants.allSpots },
    { labelKey: 'dog_parks', path: RouteConstants.petParks },
    { labelKey: 'vet_clinics', path: RouteConstants.vet_clinics },
    { labelKey: 'dog_food_title', path: RouteConstants.dogFood },
    { labelKey: 'pet_shops_title', path: RouteConstants.petShops },
    { labelKey: 'blog', path: RouteConstants.blog },
  ];

  readonly #router = inject(Router);

  /** Same hand-over as the landing page hero: the spots list reads `?word=`. */
  search(): void {
    const word = this.query.value.trim();
    void this.#router.navigate(['/', RouteConstants.allSpots], {
      queryParams: word ? { word } : {},
    });
  }
}
