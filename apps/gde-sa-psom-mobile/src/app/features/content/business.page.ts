import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonAccordion } from '@ionic/angular/ion-accordion';
import { IonAccordionGroup } from '@ionic/angular/ion-accordion-group';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { TranslocoPipe } from '@ngneat/transloco';

/** The portal's "Za biznise" page, same texts, condensed for a phone. */
@Component({
  selector: 'app-business',
  imports: [
    RouterLink,
    IonRouterLink,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonAccordionGroup,
    IonAccordion,
    IonItem,
    IonLabel,
    TranslocoPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text="" />
        </ion-buttons>
        <ion-title>{{ 'for_business_nav' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <article class="page">
        <h1>{{ 'business_hero_headline' | transloco }}</h1>
        <p class="lead">{{ 'business_hero_subheadline' | transloco }}</p>
        <p>{{ 'business_hero_description' | transloco }}</p>
        <ion-button expand="block" class="cta" [routerLink]="['/tabs/more/suggest-spot']">
          {{ 'business_cta_primary' | transloco }}
        </ion-button>
        <p class="note">{{ 'business_reassurance' | transloco }}</p>

        <h2>{{ 'business_why_join_title' | transloco }}</h2>
        @for (b of benefits; track b.title) {
          <h3>{{ b.title | transloco }}</h3>
          <p>{{ b.body | transloco }}</p>
        }

        <h2>{{ 'business_how_title' | transloco }}</h2>
        <ol class="steps">
          @for (s of steps; track s.title) {
            <li>
              <strong>{{ s.title | transloco }}</strong>
              <p>{{ s.body | transloco }}</p>
            </li>
          }
        </ol>

        <h2>{{ 'faq_title' | transloco }}</h2>
        <ion-accordion-group class="faq">
          @for (f of faq; track f.q) {
            <ion-accordion [value]="f.q">
              <ion-item slot="header">
                <ion-label class="ion-text-wrap">{{ f.q | transloco }}</ion-label>
              </ion-item>
              <div class="answer" slot="content">{{ f.a | transloco }}</div>
            </ion-accordion>
          }
        </ion-accordion-group>

        <section class="ready">
          <h2>{{ 'business_ready_title' | transloco }}</h2>
          <p>{{ 'business_reassurance_full' | transloco }}</p>
          <ion-button expand="block" [routerLink]="['/tabs/more/suggest-spot']">
            {{ 'business_cta_primary' | transloco }}
          </ion-button>
        </section>
      </article>
    </ion-content>
  `,
  styles: `
    .page {
      padding: 8px var(--app-gutter) 40px;
    }
    h1 {
      margin: 0 0 12px;
    }
    h2 {
      margin: 40px 0 12px;
      font-size: 1.25rem;
      line-height: 1.3;
    }
    h3 {
      margin: 20px 0 4px;
      font-size: 1rem;
      line-height: 1.4;
    }
    p {
      margin: 0 0 12px;
      color: var(--app-text-2);
      line-height: 1.6;
    }
    .lead {
      color: var(--app-text);
      font-size: 1.0625rem;
      font-weight: 500;
    }
    .cta {
      margin: 20px 0 8px;
    }
    .note {
      color: var(--app-text-2);
      font-size: 0.8125rem;
      text-align: center;
    }
    /* Numbered steps: the number in the brand tint, the text beside it. */
    .steps {
      margin: 0;
      padding: 0;
      list-style: none;
      counter-reset: step;
    }
    .steps li {
      position: relative;
      padding: 2px 0 8px 44px;
      counter-increment: step;
    }
    .steps li::before {
      content: counter(step);
      position: absolute;
      top: 0;
      left: 0;
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--app-primary-soft);
      color: var(--app-on-primary-soft);
      font-size: 0.875rem;
      font-weight: 700;
    }
    .steps strong {
      display: block;
      margin-bottom: 4px;
      font-weight: 600;
      line-height: 1.5;
    }
    .faq {
      border-top: 1px solid var(--app-border);
    }
    .faq ion-item {
      --padding-start: 0;
      --inner-padding-end: 0;
      --min-height: 56px;
      font-weight: 600;
    }
    .answer {
      padding: 0 0 16px;
      color: var(--app-text-2);
      line-height: 1.6;
    }
    .ready {
      margin-top: 40px;
      padding: 4px 20px 20px;
      border-radius: var(--app-radius-lg);
      background: var(--app-surface-sunken);
    }
    .ready h2 {
      margin-top: 20px;
    }
    .ready ion-button {
      margin: 8px 0 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusinessPage {
  readonly benefits = [1, 2, 3, 4, 5].map((n) => ({
    title: [
      'business_benefit_1_reach',
      'business_benefit_2_traffic',
      'business_benefit_3_transparency',
      'business_benefit_4_free',
      'business_benefit_5_brand',
    ][n - 1],
    body: `business_benefit_${n}_desc`,
  }));
  readonly steps = [1, 2, 3].map((n) => ({ title: `business_step_${n}`, body: `business_step_${n}_desc` }));
  readonly faq = [1, 2, 3].map((n) => ({ q: `faq_q${n}`, a: `faq_a${n}` }));
}
