import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonRouterLink } from '@ionic/angular/ion-router-link';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { addCircle } from 'ionicons/icons';

/**
 * The invitation to venue owners (Home and More): list your place for free.
 * The app's one loud element, so it is not repeated elsewhere on a screen.
 */
@Component({
  selector: 'app-owner-card',
  imports: [RouterLink, IonRouterLink, IonButton, IonIcon, TranslocoPipe],
  template: `
    <section class="owner">
      <svg class="ball" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="50" />
        <path d="M16 12c22 16 22 60 0 76M84 12c-22 16-22 60 0 76" />
      </svg>
      <h2>{{ 'lp_business_title' | transloco }}</h2>
      <p>{{ 'lp_business_lead' | transloco }}</p>
      <ion-button class="cta" [routerLink]="['/tabs/more/suggest-spot']">
        <ion-icon slot="start" name="add-circle" aria-hidden="true" />
        {{ 'business_cta_primary' | transloco }}
      </ion-button>
      <ion-button class="how" fill="clear" [routerLink]="['/tabs/more/business']">
        {{ 'mobile_owner_how' | transloco }}
      </ion-button>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    .owner {
      position: relative;
      overflow: hidden;
      margin: 0 16px;
      padding: 24px 20px 12px;
      border-radius: 28px;
      background: var(--app-owner-bg, #0f5a48);
      color: #ffffff;
    }
    :host-context(.ion-palette-dark) .owner {
      --app-owner-bg: #15453a;
    }
    .ball {
      position: absolute;
      top: -34px;
      right: -30px;
      width: 116px;
      height: 116px;
    }
    .ball circle {
      fill: var(--app-ball);
    }
    .ball path {
      fill: none;
      stroke: #ffffff;
      stroke-opacity: 0.85;
      stroke-width: 5;
      stroke-linecap: round;
    }
    h2 {
      margin: 0 84px 8px 0;
      font-size: 1.45rem;
      font-weight: 750;
      line-height: 1.15;
    }
    p {
      margin: 0 0 18px;
      line-height: 1.45;
      color: rgba(255, 255, 255, 0.8);
    }
    .cta {
      --background: var(--app-ball);
      --background-activated: #cadc4e;
      --color: var(--app-on-ball);
      height: 50px;
      margin: 0;
      width: 100%;
    }
    .how {
      --color: #ffffff;
      width: 100%;
      margin: 4px 0 0;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerCardComponent {
  constructor() {
    addIcons({ addCircle });
  }
}
