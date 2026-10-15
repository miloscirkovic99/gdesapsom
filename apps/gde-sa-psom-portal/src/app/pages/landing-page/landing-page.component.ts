import { ChangeDetectionStrategy, Component, computed, effect, inject, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { CardComponent } from '../../shared/components/card/card.component';
import { SeoService } from '../../core/services/seo.service';
import { homeCollectionStructuredData } from '../../shared/utils/structured-data';
import { SpotsStore, ParksStore, VetClinicsStore } from '@gde/shared/data-access';
import {
  RouteConstants,
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
  injectActiveLang,
  LocalizedName,
  LocalNamePipe,
} from '@gde/shared/util';
import { cityHubLink, nationalHubLink, STAYS_HUB_PATH } from '../../features/pet-friendly/pet-friendly-pages';

type CategoryIcon = 'restaurant' | 'cafe' | 'hotel' | 'park' | 'vet' | 'food' | 'shop';

interface Category {
  label: string;
  icon: CategoryIcon;
  link: string[];
  queryParams?: Record<string, string>;
}

/** A hub page the homepage features, with a one-line description (translation key). */
interface HomeHub {
  label: LocalizedName;
  descriptionKey: string;
  path: string;
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

/**
 * The hubs for the searches the homepage alone could not answer ("pet
 * friendly novi sad", "pet friendly smeštaj srbija"). Linked from the
 * strongest page of the site so they are found and ranked.
 */
const HOME_HUBS: readonly HomeHub[] = [
  { ...cityHubLink('beograd'), descriptionKey: 'lp_hub_beograd' },
  { ...cityHubLink('novi-sad'), descriptionKey: 'lp_hub_novi_sad' },
  { ...nationalHubLink('smestaj'), descriptionKey: 'lp_hub_smestaj' },
];

@Component({
  selector: 'app-landing-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, CardComponent, LocalNamePipe],
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
  readonly lang = injectActiveLang();
  readonly hubs = HOME_HUBS;

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

  // Restaurants, cafés and stays open their hub pages: the old `/all-spots?spotType=`
  // links canonicalised to the unfiltered list, so the category had no page of its own.
  readonly categories: Category[] = [
    { label: 'lp_cat_restaurants', icon: 'restaurant', link: [nationalHubLink('restorani').path] },
    { label: 'lp_cat_cafes', icon: 'cafe', link: [nationalHubLink('kafici').path] },
    { label: 'lp_cat_hotels', icon: 'hotel', link: [STAYS_HUB_PATH] },
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
      const english = this.lang().startsWith('en');
      this.#seo.setStructuredData(
        HOME_STRUCTURED_DATA_ID,
        homeCollectionStructuredData([
          ...HOME_SECTIONS.map((section, index) => ({ name: names[index], path: section.path })),
          ...HOME_HUBS.map((hub) => ({ name: english ? hub.label.nameEn : hub.label.nameSr, path: hub.path })),
        ]),
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
