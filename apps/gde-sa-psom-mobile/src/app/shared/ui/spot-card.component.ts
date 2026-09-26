import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonCard } from '@ionic/angular/ion-card';
import { IonCardContent } from '@ionic/angular/ion-card-content';
import { IonCardHeader } from '@ionic/angular/ion-card-header';
import { IonCardSubtitle } from '@ionic/angular/ion-card-subtitle';
import { IonCardTitle } from '@ionic/angular/ion-card-title';
import { IonChip } from '@ionic/angular/ion-chip';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { TranslocoPipe } from '@ngneat/transloco';
import { Spot } from '@gde/shared/data-access';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '@gde/shared/util';
import { formatDistance } from '../format-distance';

@Component({
  selector: 'app-spot-card',
  imports: [
    RouterLink,
    IonRouterLink,
    IonCard,
    IonCardHeader,
    IonCardSubtitle,
    IonCardTitle,
    IonCardContent,
    IonChip,
    IonLabel,
    TranslocoPipe,
  ],
  template: `
    @let s = spot();
    <ion-card [routerLink]="link()" button>
      <img class="photo" [src]="s.iuo_slika_base64 || 'assets/logo-normal.png'" alt="" loading="lazy" />
      <ion-card-header>
        <ion-card-subtitle>
          {{ typeKey() ? (typeKey()! | transloco) : s.ugo_ime }} · {{ s.grd_ime }}
          @if (distance()) {
            · {{ distance() }}
          }
        </ion-card-subtitle>
        <ion-card-title>{{ s.iuo_ime }}</ion-card-title>
      </ion-card-header>
      <ion-card-content>
        <p class="address">{{ s.iuo_adressa }}</p>
        @if (dogsKey()) {
          <ion-chip color="primary"><ion-label>{{ dogsKey()! | transloco }}</ion-label></ion-chip>
        }
        @if (gardenKey()) {
          <ion-chip><ion-label>{{ gardenKey()! | transloco }}</ion-label></ion-chip>
        }
      </ion-card-content>
    </ion-card>
  `,
  styles: `
    .photo {
      display: block;
      width: 100%;
      height: 180px;
      object-fit: cover;
      background: var(--ion-color-light);
    }
    .address {
      margin-bottom: 8px;
    }
    ion-chip {
      margin-inline-start: 0;
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
}
