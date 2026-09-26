import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { DogFoodStore, EMPTY_DOG_FOOD_FILTERS } from '@gde/shared/data-access';

@Component({
  selector: 'app-catalog',
  imports: [IonHeader, IonToolbar, IonTitle, IonContent, IonList, IonItem, IonLabel, TranslocoPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'mobile_tab_catalog' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        @for (item of food.items(); track item.id) {
          <ion-item>
            <ion-label>{{ item.name }}</ion-label>
          </ion-item>
        }
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPage {
  readonly food = inject(DogFoodStore);

  constructor() {
    this.food.search(EMPTY_DOG_FOOD_FILTERS);
  }
}
