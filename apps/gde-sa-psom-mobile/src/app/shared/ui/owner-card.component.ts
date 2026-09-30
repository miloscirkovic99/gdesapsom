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
    /* The brand's one dark surface; the tennis-ball yellow marks its single action. */
    .owner {
      margin: 0 16px;
      padding: 24px 20px 8px;
      border-radius: var(--app-radius-xl);
      background: var(--app-owner-bg, #0f5a48);
      color: #ffffff;
    }
    :host-context(.ion-palette-dark) .owner {
      --app-owner-bg: #163d33;
    }
    h2 {
      margin: 0 0 8px;
      font-size: 1.375rem;
      line-height: 1.2;
    }
    p {
      margin: 0 0 20px;
      color: rgba(255, 255, 255, 0.82);
      font-size: 0.9375rem;
      line-height: 1.5;
    }
    .cta {
      --background: var(--app-accent);
      --background-activated: var(--app-accent-pressed);
      --background-activated-opacity: 1;
      --color: var(--app-on-accent);
      margin: 0;
    }
    .how {
      --color: #ffffff;
      --background-activated: #ffffff;
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
