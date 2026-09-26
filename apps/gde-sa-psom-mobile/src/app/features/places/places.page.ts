import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { TranslocoPipe } from '@ngneat/transloco';
import { ParksStore, SpotsStore } from '@gde/shared/data-access';

@Component({
  selector: 'app-places',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, IonNote, TranslocoPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'mobile_tab_places' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-item>
          <ion-label>{{ 'find_pet_spots' | transloco }}</ion-label>
          <ion-note slot="end" data-testid="spots-total">{{ spots.totalResult() }}</ion-note>
        </ion-item>
        <ion-item>
          <ion-label>{{ 'pet_parks' | transloco }}</ion-label>
          <ion-note slot="end" data-testid="parks-total">{{ parks.parks().length }}</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlacesPage {
  readonly spots = inject(SpotsStore);
  readonly parks = inject(ParksStore);
}
