import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { CardComponent } from '../../shared/components/card/card.component';
import { SpotsStore } from '../../shared/store/spots.store';
import { ParksStore } from '../../shared/store/parks.store';
import { VetClinicsStore } from '../../shared/store/vetclinics.store';
import { RouteConstants } from '../../shared/constants/route.constant';
import {
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';

type CategoryIcon = 'restaurant' | 'cafe' | 'hotel' | 'park' | 'vet' | 'food' | 'shop';

interface Category {
  label: string;
  icon: CategoryIcon;
  link: string[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-landing-page',
  imports: [ReactiveFormsModule, RouterLink, TranslocoModule, CardComponent],
  templateUrl: './landing-page.component.html',
  styleUrl: './landing-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LandingPageComponent {
  readonly spotsStore = inject(SpotsStore);
  readonly parksStore = inject(ParksStore);
  readonly vetClinicsStore = inject(VetClinicsStore);
  readonly routeConstants = RouteConstants;
  readonly #router = inject(Router);

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
