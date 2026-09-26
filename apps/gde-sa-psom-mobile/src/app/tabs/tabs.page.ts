import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonTabBar } from '@ionic/angular/ion-tab-bar';
import { IonTabButton } from '@ionic/angular/ion-tab-button';
import { IonTabs } from '@ionic/angular/ion-tabs';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import {
  basket,
  basketOutline,
  ellipsisHorizontal,
  ellipsisHorizontalOutline,
  home,
  homeOutline,
  medkit,
  medkitOutline,
  paw,
  pawOutline,
} from 'ionicons/icons';

interface Tab {
  tab: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-tabs',
  imports: [IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel, TranslocoPipe],
  template: `
    <ion-tabs (ionTabsDidChange)="selected.set($event.tab)">
      <!-- id is the anchor ToastNotifier positions toasts above. -->
      <ion-tab-bar slot="bottom" id="app-tab-bar">
        @for (t of tabs; track t.tab) {
          <ion-tab-button [tab]="t.tab">
            <!-- The selected tab shows the filled icon inside the indicator pill. -->
            <ion-icon [name]="selected() === t.tab ? t.icon : t.icon + '-outline'" aria-hidden="true" />
            <ion-label>{{ t.label | transloco }}</ion-label>
          </ion-tab-button>
        }
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: `
    ion-tab-bar {
      height: 68px;
      padding-top: 4px;
    }
    ion-tab-button {
      --ripple-color: transparent;
      --padding-start: 0;
      --padding-end: 0;
      min-width: 0;
    }
    ion-tab-button ion-icon {
      box-sizing: content-box;
      font-size: 22px;
      padding: 5px 18px;
      margin: 0 0 4px;
      border-radius: 999px;
      transition: background-color 0.2s ease;
    }
    ion-tab-button.tab-selected ion-icon {
      background: var(--app-mint-soft);
    }
    ion-tab-button ion-label {
      font-size: 0.75rem;
      font-weight: 550;
    }
    ion-tab-button.tab-selected ion-label {
      font-weight: 750;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabsPage {
  readonly selected = signal('home');

  readonly tabs: Tab[] = [
    { tab: 'home', icon: 'home', label: 'home' },
    { tab: 'places', icon: 'paw', label: 'mobile_tab_places' },
    { tab: 'vets', icon: 'medkit', label: 'mobile_tab_vets' },
    { tab: 'catalog', icon: 'basket', label: 'mobile_tab_catalog' },
    { tab: 'more', icon: 'ellipsis-horizontal', label: 'mobile_tab_more' },
  ];

  constructor() {
    addIcons({
      home,
      homeOutline,
      paw,
      pawOutline,
      medkit,
      medkitOutline,
      basket,
      basketOutline,
      ellipsisHorizontal,
      ellipsisHorizontalOutline,
    });
  }
}
