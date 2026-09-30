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
      height: 64px;
      padding-top: 6px;
      padding-bottom: 6px;
    }
    ion-tab-button {
      --ripple-color: transparent;
      --padding-start: 0;
      --padding-end: 0;
      --padding-top: 0;
      --padding-bottom: 0;
      min-width: 0;
    }
    /* The icon sits in an indicator that fills in when its tab is selected. */
    ion-tab-button ion-icon {
      box-sizing: content-box;
      width: 22px;
      height: 22px;
      padding: 5px 20px;
      margin: 0 0 4px;
      border-radius: var(--app-radius-lg);
      transition:
        background-color 0.2s ease,
        transform 0.15s ease;
    }
    ion-tab-button.tab-selected ion-icon {
      background: var(--app-primary-soft);
      color: var(--app-on-primary-soft);
    }
    ion-tab-button:active ion-icon {
      transform: scale(0.92);
    }
    ion-tab-button ion-label {
      margin: 0;
      font-size: 0.75rem;
      font-weight: 500;
      line-height: 1.2;
    }
    ion-tab-button.tab-selected ion-label {
      color: var(--app-text);
      font-weight: 600;
    }
    /* Toasts sit just above this tab bar (ToastNotifier): their action reads as a word, not a shout. */
    ::ng-deep ion-toast::part(button) {
      font-weight: 700;
      text-transform: none;
      letter-spacing: 0;
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
