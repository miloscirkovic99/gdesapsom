import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { SpotsStore } from '@gde/shared/data-access';

@Component({
  selector: 'app-home',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, TranslocoPipe],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Gde sa psom</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (spot of spots.random(); track spot.iuo_id) {
          <ion-item>
            <ion-label>
              <h2>{{ spot.iuo_ime }}</h2>
              <p>{{ spot.iuo_adressa }}, {{ spot.grd_ime }}</p>
            </ion-label>
          </ion-item>
        } @empty {
          <ion-item>
            <ion-label>{{ 'home' | transloco }}</ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage {
  readonly spots = inject(SpotsStore);
}
