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
    <ion-content class="ion-padding">
      <h1>{{ 'business_hero_headline' | transloco }}</h1>
      <p class="lead">{{ 'business_hero_subheadline' | transloco }}</p>
      <p>{{ 'business_hero_description' | transloco }}</p>
      <ion-button expand="block" [routerLink]="['/tabs/more/suggest-spot']">
        {{ 'business_cta_primary' | transloco }}
      </ion-button>
      <p class="note">{{ 'business_reassurance' | transloco }}</p>

      <h2>{{ 'business_why_join_title' | transloco }}</h2>
      @for (b of benefits; track b.title) {
        <h3>{{ b.title | transloco }}</h3>
        <p>{{ b.body | transloco }}</p>
      }

      <h2>{{ 'business_how_title' | transloco }}</h2>
      <ol>
        @for (s of steps; track s.title) {
          <li>
            <strong>{{ s.title | transloco }}</strong>
            <p>{{ s.body | transloco }}</p>
          </li>
        }
      </ol>

      <h2>{{ 'faq_title' | transloco }}</h2>
      <ion-accordion-group>
        @for (f of faq; track f.q) {
          <ion-accordion [value]="f.q">
            <ion-item slot="header">
              <ion-label class="ion-text-wrap">{{ f.q | transloco }}</ion-label>
            </ion-item>
            <div class="ion-padding" slot="content">{{ f.a | transloco }}</div>
          </ion-accordion>
        }
      </ion-accordion-group>

      <h2>{{ 'business_ready_title' | transloco }}</h2>
      <p>{{ 'business_reassurance_full' | transloco }}</p>
      <ion-button expand="block" class="bottom-cta" [routerLink]="['/tabs/more/suggest-spot']">
        {{ 'business_cta_primary' | transloco }}
      </ion-button>
    </ion-content>
  `,
  styles: `
    h1 {
      font-size: 1.45rem;
      font-weight: 700;
      line-height: 1.25;
    }
    h2 {
      font-size: 1.15rem;
      font-weight: 600;
      margin-top: 28px;
    }
    h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 16px 0 4px;
    }
    p {
      line-height: 1.55;
    }
    .lead {
      font-weight: 500;
    }
    .note {
      font-size: 0.85rem;
      color: var(--ion-color-medium);
      text-align: center;
    }
    ol {
      padding-inline-start: 20px;
    }
    .bottom-cta {
      margin-bottom: 24px;
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
