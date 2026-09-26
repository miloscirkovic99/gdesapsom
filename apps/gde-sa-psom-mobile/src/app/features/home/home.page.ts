import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonChip } from '@ionic/angular/ion-chip';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonRefresher } from '@ionic/angular/ion-refresher';
import { IonRefresherContent } from '@ionic/angular/ion-refresher-content';
import { IonSearchbar } from '@ionic/angular/ion-searchbar';
import { IonSkeletonText } from '@ionic/angular/ion-skeleton-text';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import type { RefresherCustomEvent } from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  basketOutline,
  bedOutline,
  cafeOutline,
  leafOutline,
  medkitOutline,
  restaurantOutline,
  storefrontOutline,
} from 'ionicons/icons';
import { SpotsStore } from '@gde/shared/data-access';
import { injectActiveLang } from '@gde/shared/util';
import { SpotCardComponent } from '../../shared/ui/spot-card.component';

interface Category {
  label: string;
  icon: string;
  commands: string[];
  queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-home',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonSearchbar,
    IonChip,
    IonIcon,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonButton,
    IonSkeletonText,
    TranslocoPipe,
    SpotCardComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Gde sa psom</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <ion-refresher slot="fixed" (ionRefresh)="refresh($event)">
        <ion-refresher-content />
      </ion-refresher>

      <section class="hero ion-padding">
        <h1>{{ 'lp_hero_title' | transloco }}</h1>
        <ion-searchbar
          #searchbar
          [placeholder]="'lp_search_placeholder' | transloco"
          enterkeyhint="search"
          (keyup.enter)="search(searchbar.value)"
        />
      </section>

      <h2 class="section-title ion-padding-horizontal">{{ 'lp_cats_title' | transloco }}</h2>
      <div class="chips ion-padding-horizontal">
        @for (c of categories; track c.label) {
          <ion-chip (click)="open(c)">
            <ion-icon [name]="c.icon" aria-hidden="true" />
            <ion-label>{{ c.label | transloco }}</ion-label>
          </ion-chip>
        }
      </div>

      <h2 class="section-title ion-padding-horizontal">{{ 'random_spot_title' | transloco }}</h2>
      @for (spot of spots.random(); track spot.iuo_id) {
        <app-spot-card [spot]="spot" [link]="['/tabs/home/spots', '' + spot.iuo_id]" [lang]="lang()" />
      } @empty {
        @for (i of [1, 2]; track i) {
          <ion-card>
            <ion-skeleton-text [animated]="true" style="height: 180px; margin: 0" />
            <ion-card-content>
              <ion-skeleton-text [animated]="true" style="width: 60%" />
              <ion-skeleton-text [animated]="true" style="width: 80%" />
            </ion-card-content>
          </ion-card>
        }
      }

      <ion-card class="add-card">
        <ion-card-header>
          <ion-card-title>{{ 'lp_add_title' | transloco }}</ion-card-title>
        </ion-card-header>
        <ion-card-content>
          <p>{{ 'lp_add_lead' | transloco }}</p>
          <ion-button expand="block" (click)="suggest()">
            <ion-icon slot="start" name="add-circle-outline" aria-hidden="true" />
            {{ 'lp_add_cta' | transloco }}
          </ion-button>
        </ion-card-content>
      </ion-card>
    </ion-content>
  `,
  styles: `
    .hero h1 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 8px 4px 12px;
    }
    .hero ion-searchbar {
      padding: 0;
    }
    .section-title {
      font-size: 1.1rem;
      font-weight: 600;
      margin: 16px 0 8px;
    }
    .chips {
      display: flex;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .chips ion-chip {
      flex: 0 0 auto;
    }
    .add-card {
      margin-bottom: 24px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly spots = inject(SpotsStore);
  readonly lang = injectActiveLang();
  private readonly router = inject(Router);

  readonly categories: Category[] = [
    { label: 'lp_cat_restaurants', icon: 'restaurant-outline', commands: ['/tabs/places'], queryParams: { spotType: 'Restoran' } },
    { label: 'lp_cat_cafes', icon: 'cafe-outline', commands: ['/tabs/places'], queryParams: { spotType: 'Kafić' } },
    { label: 'lp_cat_hotels', icon: 'bed-outline', commands: ['/tabs/places'], queryParams: { spotType: 'Hotel' } },
    { label: 'lp_cat_parks', icon: 'leaf-outline', commands: ['/tabs/places'], queryParams: { segment: 'parks' } },
    { label: 'lp_cat_vets', icon: 'medkit-outline', commands: ['/tabs/vets'] },
    { label: 'lp_cat_food', icon: 'basket-outline', commands: ['/tabs/catalog'], queryParams: { segment: 'food' } },
    { label: 'lp_cat_shops', icon: 'storefront-outline', commands: ['/tabs/catalog'], queryParams: { segment: 'shops' } },
  ];

  constructor() {
    addIcons({
      restaurantOutline,
      cafeOutline,
      bedOutline,
      leafOutline,
      medkitOutline,
      basketOutline,
      storefrontOutline,
      addCircleOutline,
    });
  }

  search(value: string | null | undefined): void {
    const word = (value ?? '').trim();
    void this.router.navigate(['/tabs/places'], { queryParams: { segment: 'venues', word: word || null } });
  }

  open(category: Category): void {
    void this.router.navigate(category.commands, { queryParams: category.queryParams ?? {} });
  }

  suggest(): void {
    void this.router.navigate(['/tabs/more/suggest-spot']);
  }

  refresh(event: RefresherCustomEvent): void {
    this.spots.randomSpots();
    setTimeout(() => event.target.complete(), 800);
  }
}
