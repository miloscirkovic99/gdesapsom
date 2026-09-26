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
import { VetClinicsStore } from '@gde/shared/data-access';

@Component({
  selector: 'app-vets',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, TranslocoPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'vet_clinics' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (clinic of vets.vetClinicsList(); track clinic.vetc_id) {
          <ion-item>
            <ion-label>
              <h2>{{ clinic.vetc_naziv }}</h2>
              <p>{{ clinic.vetc_adresa }}</p>
            </ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VetsPage {
  readonly vets = inject(VetClinicsStore);
}
