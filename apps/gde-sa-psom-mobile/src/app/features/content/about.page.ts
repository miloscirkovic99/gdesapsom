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
    <ion-content>
      <article class="page">
        <img class="logo" src="assets/logo-normal.png" alt="Gde sa psom" />
        <h1>{{ 'who_we_are' | transloco }}</h1>
        <p class="lead">{{ 'site_info' | transloco }}</p>
        @for (s of sections; track s.title) {
          <h2>{{ s.title | transloco }}</h2>
          <p>{{ s.body | transloco }}</p>
        }
      </article>
    </ion-content>
  `,
  styles: `
    .page {
      padding: 8px var(--app-gutter) 40px;
    }
    .logo {
      display: block;
      width: 88px;
      height: 88px;
      margin: 0 0 8px -12px;
    }
    h1 {
      margin: 0 0 12px;
    }
    h2 {
      margin: 32px 0 8px;
      font-size: 1.25rem;
      line-height: 1.3;
    }
    p {
      margin: 0;
      color: var(--app-text-2);
      font-size: 1rem;
      line-height: 1.6;
    }
    .lead {
      color: var(--app-text);
      font-size: 1.0625rem;
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
