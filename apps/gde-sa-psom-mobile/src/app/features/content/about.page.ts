import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';

/** The portal's "O nama" page, same texts. */
@Component({
  selector: 'app-about',
  imports: [IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, TranslocoPipe],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text="" />
        </ion-buttons>
        <ion-title>{{ 'about' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content class="ion-padding">
      <img class="logo" src="assets/logo-normal.png" alt="Gde sa psom" />
      <h2>{{ 'who_we_are' | transloco }}</h2>
      <p>{{ 'site_info' | transloco }}</p>
      @for (s of sections; track s.title) {
        <h2>{{ s.title | transloco }}</h2>
        <p>{{ s.body | transloco }}</p>
      }
    </ion-content>
  `,
  styles: `
    .logo {
      display: block;
      width: 120px;
      margin: 8px auto 16px;
    }
    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      margin-top: 20px;
    }
    p {
      line-height: 1.55;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AboutPage {
  readonly sections = [
    { title: 'free_use', body: 'free_use_description' },
    { title: 'how_to_suggest', body: 'how_to_suggest_description' },
    { title: 'important_to_know', body: 'important_to_know_description' },
  ];
}
