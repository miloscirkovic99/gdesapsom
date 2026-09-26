import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonList } from '@ionic/angular/ion-list';
import { IonListHeader } from '@ionic/angular/ion-list-header';
import { IonNote } from '@ionic/angular/ion-note';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToggle } from '@ionic/angular/ion-toggle';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import {
  addCircleOutline,
  briefcaseOutline,
  documentTextOutline,
  informationCircleOutline,
  languageOutline,
  leafOutline,
  moonOutline,
  newspaperOutline,
} from 'ionicons/icons';
import { SITE_ORIGIN } from '@gde/shared/util';
import { AppSettingsService } from '../../core/platform/app-settings.service';
import { ExternalLinkService } from '../../core/platform/external-link.service';

@Component({
  selector: 'app-more',
  imports: [
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonIcon,
    IonNote,
    IonSelect,
    IonSelectOption,
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
          <ion-label>{{ 'mobile_suggest' | transloco }}</ion-label>
        </ion-list-header>
        <ion-item [routerLink]="['/tabs/more/suggest-spot']" detail="true">
          <ion-icon slot="start" name="add-circle-outline" aria-hidden="true" />
          <ion-label>{{ 'add_spot' | transloco }}</ion-label>
        </ion-item>
        <ion-item [routerLink]="['/tabs/more/suggest-park']" detail="true">
          <ion-icon slot="start" name="leaf-outline" aria-hidden="true" />
          <ion-label>{{ 'add_park' | transloco }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>{{ 'mobile_read' | transloco }}</ion-label>
        </ion-list-header>
        <ion-item [routerLink]="['/tabs/more/blog']" detail="true">
          <ion-icon slot="start" name="newspaper-outline" aria-hidden="true" />
          <ion-label>{{ 'blog' | transloco }}</ion-label>
        </ion-item>
        <ion-item [routerLink]="['/tabs/more/about']" detail="true">
          <ion-icon slot="start" name="information-circle-outline" aria-hidden="true" />
          <ion-label>{{ 'about' | transloco }}</ion-label>
        </ion-item>
        <ion-item [routerLink]="['/tabs/more/business']" detail="true">
          <ion-icon slot="start" name="briefcase-outline" aria-hidden="true" />
          <ion-label>{{ 'for_business_nav' | transloco }}</ion-label>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-list-header>
          <ion-label>{{ 'mobile_settings' | transloco }}</ion-label>
        </ion-list-header>
        <ion-item>
          <ion-icon slot="start" name="language-outline" aria-hidden="true" />
          <ion-select
            [label]="'language' | transloco"
            interface="action-sheet"
            [cancelText]="'mobile_cancel' | transloco"
            [value]="settings.language()"
            (ionChange)="setLanguage($event.detail.value)"
          >
            <ion-select-option value="rs">Srpski</ion-select-option>
            <ion-select-option value="en">English</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-icon slot="start" name="moon-outline" aria-hidden="true" />
          <ion-toggle
            [checked]="settings.theme() === 'dark'"
            (ionChange)="settings.setTheme($event.detail.checked ? 'dark' : 'light')"
          >
            {{ 'mobile_dark_theme' | transloco }}
          </ion-toggle>
        </ion-item>
      </ion-list>

      <ion-list>
        <ion-item button detail="true" (click)="openPolicy()">
          <ion-icon slot="start" name="document-text-outline" aria-hidden="true" />
          <ion-label>{{ 'mobile_privacy' | transloco }}</ion-label>
        </ion-item>
        <ion-item lines="none">
          <ion-label>{{ 'mobile_app_version' | transloco }}</ion-label>
          <ion-note slot="end">{{ version() }}</ion-note>
        </ion-item>
      </ion-list>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MorePage {
  readonly settings = inject(AppSettingsService);
  private readonly links = inject(ExternalLinkService);

  readonly version = signal('web');

  constructor() {
    addIcons({
      addCircleOutline,
      leafOutline,
      newspaperOutline,
      informationCircleOutline,
      briefcaseOutline,
      languageOutline,
      moonOutline,
      documentTextOutline,
    });
    if (Capacitor.isNativePlatform()) {
      void App.getInfo().then((info) => this.version.set(`${info.version} (${info.build})`));
    }
  }

  setLanguage(value: unknown): void {
    if (value === 'rs' || value === 'en') this.settings.setLanguage(value);
  }

  openPolicy(): void {
    void this.links.openWeb(`${SITE_ORIGIN}/cookies-policy`);
  }
}
