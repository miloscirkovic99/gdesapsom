import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard } from '@ionic/angular/ion-card';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { leafOutline, locationOutline, navigate, paw } from 'ionicons/icons';
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
        <img [src]="s.iuo_slika_base64 || 'assets/logo-normal.png'" alt="" loading="lazy" />
        <span class="badge">{{ typeKey() ? (typeKey()! | transloco) : s.ugo_ime }}</span>
        @if (distance()) {
          <span class="badge distance">
            <ion-icon name="navigate" aria-hidden="true" />
            {{ distance() }}
          </span>
        }
      </div>
      <div class="body">
        <h3>{{ s.iuo_ime }}</h3>
        <p class="where">
          <ion-icon name="location-outline" aria-hidden="true" />
          <span>{{ s.iuo_adressa ? s.iuo_adressa + ', ' : '' }}{{ s.grd_ime }}</span>
        </p>
        @if (dogsKey() || gardenKey()) {
          <div class="tags">
            @if (dogsKey()) {
              <span class="tag dogs"><ion-icon name="paw" aria-hidden="true" />{{ dogsKey()! | transloco }}</span>
            }
            @if (gardenKey()) {
              <span class="tag"><ion-icon name="leaf-outline" aria-hidden="true" />{{ gardenKey()! | transloco }}</span>
            }
          </div>
        }
      </div>
    </ion-card>
  `,
  styles: `
    :host {
      display: block;
    }
    ion-card {
      margin: 0;
      height: 100%;
    }
    .media {
      position: relative;
    }
    img {
      display: block;
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      background: var(--app-surface-2);
    }
    .badge {
      position: absolute;
      top: 12px;
      left: 12px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 5px 11px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.92);
      color: #12241d;
      font-size: 0.8rem;
      font-weight: 650;
    }
    .distance {
      left: auto;
      right: 12px;
      background: #0f5a48;
      color: #ffffff;
    }
    .body {
      padding: 14px 16px 16px;
    }
    h3 {
      margin: 0 0 6px;
      font-size: 1.2rem;
      font-weight: 700;
      line-height: 1.2;
      color: var(--app-ink);
    }
    .where {
      display: flex;
      gap: 6px;
      margin: 0;
      color: var(--app-ink-2);
      font-size: 0.9rem;
      line-height: 1.35;
    }
    .where ion-icon {
      flex: none;
      margin-top: 2px;
    }
    .where span {
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 12px;
    }
    .tag {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 5px 10px;
      border-radius: 999px;
      background: var(--app-surface-2);
      color: var(--app-ink);
      font-size: 0.8rem;
      font-weight: 600;
    }
    .tag.dogs {
      background: var(--app-mint-soft);
      color: var(--app-pine);
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
    addIcons({ leafOutline, locationOutline, navigate, paw });
  }
}
