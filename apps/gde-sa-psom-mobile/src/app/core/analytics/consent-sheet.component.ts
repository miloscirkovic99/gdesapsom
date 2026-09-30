import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { ModalController } from '@ionic/angular/modal-controller';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { barChartOutline, checkmarkCircle } from 'ionicons/icons';
import { RouteConstants, SITE_ORIGIN } from '@gde/shared/util';
import { ExternalLinkService } from '../platform/external-link.service';
import { AnalyticsConsent } from './analytics-consent.service';

/**
 * The first-launch question about usage statistics (ConsentPromptService).
 * Closes with role 'granted' or 'denied'; both answers are one tap and look
 * alike, so saying no is as easy as saying yes.
 */
@Component({
  selector: 'app-consent-sheet',
  imports: [IonButton, IonIcon, TranslocoPipe],
  template: `
    <div class="sheet">
      <div class="mark"><ion-icon name="bar-chart-outline" aria-hidden="true" /></div>
      <h2 id="consent-title">{{ 'mobile_consent_title' | transloco }}</h2>
      <p class="lead">{{ 'mobile_consent_lead' | transloco }}</p>
      <ul class="points">
        <li><ion-icon name="checkmark-circle" aria-hidden="true" />{{ 'mobile_consent_no_identity' | transloco }}</li>
        <li><ion-icon name="checkmark-circle" aria-hidden="true" />{{ 'mobile_consent_no_ads' | transloco }}</li>
        <li><ion-icon name="checkmark-circle" aria-hidden="true" />{{ 'mobile_consent_change' | transloco }}</li>
      </ul>
      <div class="answers">
        <ion-button expand="block" (click)="answer('granted')">
          {{ 'mobile_consent_allow' | transloco }}
        </ion-button>
        <ion-button expand="block" fill="outline" (click)="answer('denied')">
          {{ 'mobile_consent_deny' | transloco }}
        </ion-button>
      </div>
      <ion-button class="policy" fill="clear" size="small" (click)="openPolicy()">
        {{ 'mobile_privacy' | transloco }}
      </ion-button>
    </div>
  `,
  styles: `
    .sheet {
      padding: 28px var(--app-gutter) calc(12px + var(--ion-safe-area-bottom, 0px));
      background: var(--app-surface-raised);
      color: var(--app-text);
    }
    .mark {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: 20px;
      border-radius: var(--app-radius-md);
      background: var(--app-primary-soft);
      color: var(--app-on-primary-soft);
      font-size: 24px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.375rem;
      line-height: 1.2;
    }
    .lead {
      margin: 0 0 20px;
      color: var(--app-text-2);
      font-size: 0.9375rem;
      line-height: 1.55;
    }
    .points {
      display: grid;
      gap: 12px;
      margin: 0 0 28px;
      padding: 0;
      list-style: none;
      font-size: 0.9375rem;
      font-weight: 500;
    }
    .points li {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      line-height: 1.4;
    }
    .points ion-icon {
      flex: none;
      margin-top: 1px;
      font-size: 20px;
      color: var(--app-primary);
    }
    .answers {
      display: grid;
      gap: 12px;
    }
    .answers ion-button {
      margin: 0;
    }
    .policy {
      --color: var(--app-text-2);
      display: block;
      width: fit-content;
      margin: 8px auto 0;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConsentSheetComponent {
  private readonly modals = inject(ModalController);
  private readonly links = inject(ExternalLinkService);

  constructor() {
    addIcons({ barChartOutline, checkmarkCircle });
  }

  answer(consent: AnalyticsConsent): void {
    void this.modals.dismiss(undefined, consent);
  }

  openPolicy(): void {
    void this.links.openWeb(`${SITE_ORIGIN}/${RouteConstants.privacyPolicy}`);
  }
}
