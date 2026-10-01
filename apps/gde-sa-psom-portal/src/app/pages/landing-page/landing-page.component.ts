import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { CardComponent } from '../../shared/components/card/card.component';
import { SeoService } from '../../core/services/seo.service';
import { homeCollectionStructuredData } from '../../shared/utils/structured-data';
import { SpotsStore, ParksStore, VetClinicsStore } from '@gde/shared/data-access';
import { RouteConstants, descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '@gde/shared/util';

type CategoryIcon = 'restaurant' | 'cafe' | 'hotel' | 'park' | 'vet' | 'food' | 'shop';

interface Category {
  label: string;
  icon: CategoryIcon;
  link: string[];
  queryParams?: Record<string, string>;
}

const HOME_STRUCTURED_DATA_ID = 'home';

/**
 * The list pages the homepage's CollectionPage schema points to. Real pages
 * only: the old block in index.html listed `?spotType=` filter URLs, which
 * canonicalise to /all-spots and are not pages of their own.
 */
const HOME_SECTIONS = [
  { labelKey: 'breadcrumb_spots', path: RouteConstants.allSpots },
  { labelKey: 'dog_parks', path: RouteConstants.petParks },
  { labelKey: 'vet_clinics', path: RouteConstants.vet_clinics },
  { labelKey: 'dog_food_title', path: RouteConstants.dogFood },
  { labelKey: 'pet_shops_title', path: RouteConstants.petShops },
];

@Component({
  selector: 'app-landing-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, CardComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent implements OnDestroy {
  readonly spotsStore = inject(SpotsStore);
  readonly parksStore = inject(ParksStore);
  readonly vetClinicsStore = inject(VetClinicsStore);
  readonly routeConstants = RouteConstants;
  readonly #router = inject(Router);
  readonly #seo = inject(SeoService);
  readonly #transloco = inject(TranslocoService);

  /** Section names in the active language, once translations have loaded. */
  readonly #sectionNames = toSignal(
    this.#transloco.selectTranslate<string[]>(HOME_SECTIONS.map((section) => section.labelKey)),
  );

  /** Free-text search in the hero; submits to the spots list as `?word=`. */
  readonly searchControl = new FormControl('', { nonNullable: true });

  // Serbian API strings -> translation keys (shared with the card component)
  readonly typeKey = descriptionToKeyMapSpot;
  readonly dogsKey = descriptionToKeyMap;
  readonly gardenKey = descriptionToKeyMapGarden;

  /** First three random spots power the live preview in the hero. */
  readonly previewSpots = computed(() => this.spotsStore.random().slice(0, 3));
  /** One real listing, used to explain what every entry tells you. */
  readonly exampleSpot = computed(() => this.spotsStore.random()[0] ?? null);
  /** The rest of the random set, so the featured grid does not repeat the hero. */
  readonly featuredSpots = computed(() => {
    const all = this.spotsStore.random();
    return all.length > 3 ? all.slice(3) : all;
  });
  readonly isLoadingRandom = computed(() => this.spotsStore.random().length === 0);

  readonly counts = computed(() => ({
    spots: this.spotsStore.totalResult(),
    parks: this.parksStore.parks().length,
    vets: this.vetClinicsStore.totalCount(),
  }));

  readonly categories: Category[] = [
    { label: 'lp_cat_restaurants', icon: 'restaurant', link: ['/', RouteConstants.allSpots], queryParams: { spotType: 'Restoran' } },
    { label: 'lp_cat_cafes', icon: 'cafe', link: ['/', RouteConstants.allSpots], queryParams: { spotType: 'Kafić' } },
    { label: 'lp_cat_hotels', icon: 'hotel', link: ['/', RouteConstants.allSpots], queryParams: { spotType: 'Hotel' } },
    { label: 'lp_cat_parks', icon: 'park', link: ['/', RouteConstants.petParks] },
    { label: 'lp_cat_vets', icon: 'vet', link: ['/', RouteConstants.vet_clinics] },
    { label: 'lp_cat_food', icon: 'food', link: ['/', RouteConstants.dogFood] },
    { label: 'lp_cat_shops', icon: 'shop', link: ['/', RouteConstants.petShops] },
  ];

  readonly problems = ['lp_problem_1', 'lp_problem_2', 'lp_problem_3'];

  readonly facts: { icon: 'type' | 'dogs' | 'garden'; title: string; desc: string }[] = [
    { icon: 'type', title: 'lp_fact_type_title', desc: 'lp_fact_type_desc' },
    { icon: 'dogs', title: 'lp_fact_dogs_title', desc: 'lp_fact_dogs_desc' },
    { icon: 'garden', title: 'lp_fact_garden_title', desc: 'lp_fact_garden_desc' },
  ];

  readonly steps = [
    { title: 'lp_step_1_title', desc: 'lp_step_1_desc' },
    { title: 'lp_step_2_title', desc: 'lp_step_2_desc' },
    { title: 'lp_step_3_title', desc: 'lp_step_3_desc' },
  ];

  constructor() {
    // The CollectionPage block lives here, not in index.html, so it exists on
    // "/" only; it used to ship on every spot and blog page as well.
    effect(() => {
      const names = this.#sectionNames();
      if (!names) return;
      this.#seo.setStructuredData(
        HOME_STRUCTURED_DATA_ID,
        homeCollectionStructuredData(HOME_SECTIONS.map((section, index) => ({ name: names[index], path: section.path }))),
      );
    });
  }

  ngOnDestroy(): void {
    this.#seo.clearStructuredData(HOME_STRUCTURED_DATA_ID);
  }

  submitSearch(): void {
    const word = this.searchControl.value.trim();
    this.#router.navigate(['/', RouteConstants.allSpots], {
      queryParams: word ? { word } : {},
    });
  }

  spotImage(spot: any): string {
    return spot?.iuo_slika_base64 || 'assets/logo-normal.png';
  }
}
