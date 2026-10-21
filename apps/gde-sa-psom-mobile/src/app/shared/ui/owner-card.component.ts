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
      <h2>{{ 'lp_business_title' | transloco }}</h2>
      <p>{{ 'lp_business_lead' | transloco }}</p>
      <ion-button class="cta" expand="block" [routerLink]="['/tabs/more/suggest-spot']">
        <ion-icon slot="start" name="add-circle" aria-hidden="true" />
        {{ 'business_cta_primary' | transloco }}
      </ion-button>
      <ion-button class="how" fill="clear" expand="block" [routerLink]="['/tabs/more/business']">
        {{ 'mobile_owner_how' | transloco }}
      </ion-button>
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    /* The website's slate neutral, dark in both themes; the emerald marks its single action. */
    .owner {
      margin: 0 16px;
      padding: 24px 20px 8px;
      border-radius: var(--app-radius-xl);
      background: var(--app-neutral);
      color: var(--app-on-neutral);
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.375rem;
      line-height: 1.2;
    }
    p {
      margin: 0 0 20px;
      color: rgba(248, 250, 252, 0.8);
      font-size: 0.9375rem;
      line-height: 1.5;
    }
    /* The dark theme's emerald and its dark text, which read best on slate in both themes. */
    .cta {
      --background: #34d399;
      --background-activated: #10b981;
      --background-activated-opacity: 1;
      --color: #022c22;
      margin: 0;
    }
    .how {
      --color: var(--app-on-neutral);
      --background-activated: var(--app-on-neutral);
      --background-activated-opacity: 0.1;
      height: 48px;
      margin: 4px 0 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OwnerCardComponent {
  constructor() {
    addIcons({ addCircle });
  }
}
