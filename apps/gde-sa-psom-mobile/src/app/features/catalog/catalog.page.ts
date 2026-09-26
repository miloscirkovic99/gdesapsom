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
