import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonTabBar } from '@ionic/angular/ion-tab-bar';
import { IonTabButton } from '@ionic/angular/ion-tab-button';
import { IonTabs } from '@ionic/angular/ion-tabs';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { basketOutline, ellipsisHorizontalOutline, homeOutline, medkitOutline, pawOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslocoPipe],
  template: `
    <ion-tabs>
      <!-- id is the anchor ToastNotifier positions toasts above. -->
      <ion-tab-bar slot="bottom" id="app-tab-bar">
        <ion-tab-button tab="home">
          <ion-icon name="home-outline" aria-hidden="true" />
          <ion-label>{{ 'home' | transloco }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="places">
          <ion-icon name="paw-outline" aria-hidden="true" />
          <ion-label>{{ 'mobile_tab_places' | transloco }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="vets">
          <ion-icon name="medkit-outline" aria-hidden="true" />
          <ion-label>{{ 'mobile_tab_vets' | transloco }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="catalog">
          <ion-icon name="basket-outline" aria-hidden="true" />
          <ion-label>{{ 'mobile_tab_catalog' | transloco }}</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="more">
          <ion-icon name="ellipsis-horizontal-outline" aria-hidden="true" />
          <ion-label>{{ 'mobile_tab_more' | transloco }}</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  constructor() {
    addIcons({ homeOutline, pawOutline, medkitOutline, basketOutline, ellipsisHorizontalOutline });
  }
}
