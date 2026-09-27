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
      padding: 28px 20px calc(12px + var(--ion-safe-area-bottom, 0px));
      background: var(--app-surface);
      color: var(--app-ink);
    }
    .mark {
      display: grid;
      place-items: center;
      width: 56px;
      height: 56px;
      margin-bottom: 16px;
      border-radius: 18px;
      background: var(--app-mint-soft);
      color: var(--app-pine);
      font-size: 28px;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.45rem;
      font-weight: 750;
      line-height: 1.15;
    }
    .lead {
      margin: 0 0 16px;
      color: var(--app-ink-2);
      line-height: 1.5;
    }
    .points {
      display: grid;
      gap: 10px;
      margin: 0 0 24px;
      padding: 0;
      list-style: none;
      font-weight: 550;
    }
    .points li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      line-height: 1.35;
    }
    .points ion-icon {
      flex: none;
      margin-top: 1px;
      font-size: 20px;
      color: var(--app-pine);
    }
    .answers {
      display: grid;
      gap: 10px;
    }
    .answers ion-button {
      margin: 0;
    }
    .policy {
      display: block;
      width: fit-content;
      margin: 8px auto 0;
      --color: var(--app-ink-2);
      font-weight: 600;
      text-decoration: underline;
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
