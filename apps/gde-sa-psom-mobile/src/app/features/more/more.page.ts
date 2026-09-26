import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonListHeader } from '@ionic/angular/ion-list-header';
import { IonSegment } from '@ionic/angular/ion-segment';
import { IonSegmentButton } from '@ionic/angular/ion-segment-button';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { AppLanguage, AppSettingsService } from '../../core/platform/app-settings.service';

@Component({
  selector: 'app-more',
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonToggle,
    TranslocoPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'mobile_tab_more' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <ion-list>
        <ion-list-header>
          <ion-label>{{ 'mobile_settings' | transloco }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-label>{{ 'language' | transloco }}</ion-label>
          <ion-segment
            slot="end"
            [value]="settings.language()"
            (ionChange)="setLanguage($event.detail.value)"
          >
            <ion-segment-button value="rs"><ion-label>SR</ion-label></ion-segment-button>
            <ion-segment-button value="en"><ion-label>EN</ion-label></ion-segment-button>
          </ion-segment>
        </ion-item>
        <ion-item>
          <ion-toggle
            [checked]="settings.theme() === 'dark'"
            (ionChange)="settings.setTheme($event.detail.checked ? 'dark' : 'light')"
          >
            {{ 'mobile_dark_theme' | transloco }}
          </ion-toggle>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MorePage {
  readonly settings = inject(AppSettingsService);

  setLanguage(value: unknown): void {
    if (value === 'rs' || value === 'en') this.settings.setLanguage(value as AppLanguage);
  }
}
