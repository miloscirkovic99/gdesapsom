import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonContent } from '@ionic/angular/ion-content';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import type { RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import {
  add,
  basketOutline,
  bedOutline,
  beerOutline,
  cafeOutline,
  chevronForward,
  imageOutline,
  leafOutline,
  locationOutline,
  medkitOutline,
  navigateOutline,
  restaurantOutline,
  shuffle,
  storefrontOutline,
  timeOutline,
} from 'ionicons/icons';
import { SpotsStore } from '@gde/shared/data-access';
import { descriptionToKeyMapSpot, injectActiveLang } from '@gde/shared/util';
import { RecentActivityService } from '../../core/recent/recent-activity.service';
import { OwnerCardComponent } from '../../shared/ui/owner-card.component';
import { SpotCardComponent } from '../../shared/ui/spot-card.component';
import { HUB_CITIES, SPOT_CATEGORIES } from '../places/place-groups';
import { freshLink, placesQueryParams } from '../places/place-links';

interface Category {
  label: string;
  icon: string;
  commands: string[];
  queryParams?: Record<string, string>;
}

/** A city or the accommodation list, as in the website's hubs section. */
interface Hub extends Category {
  description: string;
}

@Component({
  selector: 'app-home',
  imports: [
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonButton,
    IonIcon,
    IonSkeletonText,
    TranslocoPipe,
    SpotCardComponent,
    OwnerCardComponent,
  ],
  templateUrl: './home.page.html',
  styleUrl: './home.page.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly spots = inject(SpotsStore);
  readonly recent = inject(RecentActivityService);
  readonly lang = injectActiveLang();
  private readonly router = inject(Router);

  private readonly rail = viewChild<ElementRef<HTMLElement>>('rail');

  readonly spotTypeKey = descriptionToKeyMapSpot;
  readonly greeting = greetingKey(new Date().getHours());
  /** True from a tap on "Shuffle" until the new set arrives. */
  readonly shuffling = signal(false);

  /** The website's categories (several venue types each, labelled for what they open), then the other tabs. */
  readonly categories: Category[] = [
    ...SPOT_CATEGORIES.map((c) => ({
      label: c.labelKey,
      icon: c.icon,
      commands: ['/tabs/places'],
      queryParams: placesQueryParams({ category: c.slug }),
    })),
    { label: 'lp_cat_parks', icon: 'leaf-outline', commands: ['/tabs/places'], queryParams: { segment: 'parks' } },
    { label: 'lp_cat_vets', icon: 'medkit-outline', commands: ['/tabs/vets'] },
    { label: 'lp_cat_food', icon: 'basket-outline', commands: ['/tabs/catalog'], queryParams: { segment: 'food' } },
    { label: 'lp_cat_shops', icon: 'storefront-outline', commands: ['/tabs/catalog'], queryParams: { segment: 'shops' } },
  ];

  readonly nearMe: Category = {
    label: 'mobile_near_me',
    icon: 'navigate-outline',
    commands: ['/tabs/places'],
    queryParams: { segment: 'venues', near: '1' },
  };

  /** Beograd, Novi Sad and accommodation, with the website's descriptions. */
  readonly hubs: Hub[] = [
    ...HUB_CITIES.map((city) => ({
      label: city.labelKey,
      description: city.descriptionKey,
      icon: 'location-outline',
      commands: ['/tabs/places'],
      queryParams: placesQueryParams({ city: city.slug }),
    })),
    {
      label: 'mobile_cat_stays',
      description: 'lp_hub_smestaj',
      icon: 'bed-outline',
      commands: ['/tabs/places'],
      queryParams: placesQueryParams({ category: 'smestaj' }),
    },
  ];

  constructor() {
    addIcons({
      add,
      restaurantOutline,
      cafeOutline,
      bedOutline,
      beerOutline,
      chevronForward,
      imageOutline,
      locationOutline,
      leafOutline,
      medkitOutline,
      basketOutline,
      storefrontOutline,
      navigateOutline,
      shuffle,
      timeOutline,
    });

    // A new random set has arrived: stop the shuffle icon, show the set from its start.
    effect(() => {
      this.spots.random();
      untracked(() => {
        if (!this.shuffling()) return;
        this.shuffling.set(false);
        this.rail()?.nativeElement.scrollTo({ left: 0, behavior: 'smooth' });
      });
    });
  }

  search(value: string | null | undefined): void {
    const word = (value ?? '').trim();
    if (word) this.recent.addSearch(word);
    void this.router.navigate(['/tabs/places'], { queryParams: freshLink({ segment: 'venues', word }) });
  }

  /** Each tap is a new link, so the target screen applies it even when it followed the same one before. */
  open(category: Category): void {
    const params = category.queryParams;
    void this.router.navigate(category.commands, { queryParams: params ? freshLink(params) : {} });
  }

  openRecent(id: number): void {
    void this.router.navigate(['/tabs/home/spots', String(id)]);
  }

  suggest(): void {
    void this.router.navigate(['/tabs/more/suggest-spot']);
  }

  shuffleSpots(): void {
    if (this.shuffling()) return;
    this.shuffling.set(true);
    this.spots.randomSpots();
    // The store reports no failure for this call; never spin forever.
    setTimeout(() => this.shuffling.set(false), 8000);
  }

  refresh(event: RefresherCustomEvent): void {
    this.spots.randomSpots();
    setTimeout(() => event.target.complete(), 800);
  }
}

function greetingKey(hour: number): string {
  if (hour >= 5 && hour < 11) return 'mobile_greeting_morning';
  if (hour >= 11 && hour < 18) return 'mobile_greeting_day';
  return 'mobile_greeting_evening';
}
