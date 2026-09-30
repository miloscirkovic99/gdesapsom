import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard } from '@ionic/angular/ion-card';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { imageOutline, leafOutline, navigate, paw } from 'ionicons/icons';
import { Spot } from '@gde/shared/data-access';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '@gde/shared/util';
import { formatDistance } from '../format-distance';

@Component({
  selector: 'app-spot-card',
  imports: [RouterLink, IonRouterLink, IonCard, IonIcon, TranslocoPipe],
  template: `
    @let s = spot();
    <ion-card [routerLink]="link()" button>
      <div class="media">
        @if (s.iuo_slika_base64) {
          <img [src]="s.iuo_slika_base64" alt="" loading="lazy" />
        } @else {
          <span class="no-photo"><ion-icon name="image-outline" aria-hidden="true" /></span>
        }
      </div>
      <div class="body">
        <p class="kicker">
          <span>{{ typeKey() ? (typeKey()! | transloco) : s.ugo_ime }}</span>
          @if (distance()) {
            <span class="distance">
              <ion-icon name="navigate" aria-hidden="true" />
              {{ distance() }}
            </span>
          }
        </p>
        <h3>{{ s.iuo_ime }}</h3>
        <p class="where">{{ s.iuo_adressa ? s.iuo_adressa + ', ' : '' }}{{ s.grd_ime }}</p>
        <!-- What a dog owner scans for: who is welcome, and whether there is a garden. -->
        @if (dogsKey() || gardenKey()) {
          <p class="dogs">
            <ion-icon [name]="dogsKey() ? 'paw' : 'leaf-outline'" aria-hidden="true" />
            <span>
              @if (dogsKey()) {
                <strong>{{ dogsKey()! | transloco }}</strong>
              }
              @if (dogsKey() && gardenKey()) {
                <span class="sep" aria-hidden="true">·</span>
              }
              @if (gardenKey()) {
                {{ gardenKey()! | transloco }}
              }
            </span>
          </p>
        }
      </div>
    </ion-card>
  `,
  styles: `
    :host {
      display: block;
    }
    ion-card {
      --background: transparent;
      --ripple-color: transparent;
      height: 100%;
      margin: 0;
      overflow: visible;
      border-radius: var(--app-radius-lg);
      box-shadow: none;
      transition: transform 0.15s ease;
    }
    ion-card.ion-activated {
      transform: scale(0.985);
    }
    .media {
      aspect-ratio: 3 / 2;
      overflow: hidden;
      border-radius: var(--app-radius-lg);
      background: var(--app-surface-sunken);
    }
    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .no-photo {
      display: grid;
      place-items: center;
      height: 100%;
      color: var(--app-text-3);
      font-size: 32px;
    }
    .body {
      padding: 12px 2px 0;
    }
    .kicker {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 2px;
      color: var(--app-text-2);
      font-size: 0.8125rem;
      font-weight: 500;
      line-height: 1.4;
    }
    .distance {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: var(--app-text);
      font-weight: 600;
    }
    .distance::before {
      content: '·';
      margin-inline-end: 4px;
      color: var(--app-text-3);
      font-weight: 500;
    }
    .distance ion-icon {
      color: var(--app-primary);
      font-size: 12px;
    }
    h3 {
      display: -webkit-box;
      margin: 0 0 2px;
      overflow: hidden;
      color: var(--app-text);
      font-size: 1.0625rem;
      font-weight: 600;
      line-height: 1.35;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }
    .where {
      margin: 0;
      overflow: hidden;
      color: var(--app-text-2);
      font-size: 0.875rem;
      line-height: 1.45;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .dogs {
      display: flex;
      align-items: flex-start;
      gap: 6px;
      margin: 8px 0 0;
      color: var(--app-text-2);
      font-size: 0.875rem;
      line-height: 1.45;
    }
    .dogs ion-icon {
      flex: none;
      margin-top: 2px;
      color: var(--app-primary);
      font-size: 16px;
    }
    .dogs strong {
      color: var(--app-text);
      font-weight: 600;
    }
    .sep {
      margin: 0 4px;
      color: var(--app-text-3);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpotCardComponent {
  readonly spot = input.required<Spot>();
  /** Where tapping the card goes (the detail page inside the current tab). */
  readonly link = input.required<string[]>();
  /** Active language, for the distance format. */
  readonly lang = input('rs');

  readonly typeKey = computed(() => descriptionToKeyMapSpot[this.spot().ugo_ime] ?? null);
  readonly dogsKey = computed(() => descriptionToKeyMap[this.spot().sta_ime] ?? null);
  readonly gardenKey = computed(() => descriptionToKeyMapGarden[this.spot().bas_naziv] ?? null);
  readonly distance = computed(() => formatDistance(this.spot().distance_m, this.lang()));

  constructor() {
    addIcons({ imageOutline, leafOutline, navigate, paw });
  }
}
