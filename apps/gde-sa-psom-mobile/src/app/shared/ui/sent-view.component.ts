import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { IonButton } from '@ionic/angular/ion-button';
import { IonIcon } from '@ionic/angular/ion-icon';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';

/** Shown in place of a suggest form once the place has been sent. */
@Component({
  selector: 'app-sent-view',
  imports: [IonButton, IonIcon, TranslocoPipe],
  template: `
    <div class="sent" role="status">
      <div class="mark"><ion-icon name="checkmark" aria-hidden="true" /></div>
      <h1>{{ 'mobile_sent_title' | transloco }}</h1>
      <p>{{ 'mobile_sent_lead' | transloco }}</p>
      <ion-button expand="block" (click)="home.emit()">{{ 'mobile_sent_home' | transloco }}</ion-button>
      <ion-button expand="block" fill="clear" (click)="another.emit()">{{ 'mobile_sent_another' | transloco }}</ion-button>
    </div>
  `,
  styles: `
    .sent {
      padding: 48px 8px 24px;
      text-align: center;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 88px;
      height: 88px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: var(--app-mint-soft);
      color: var(--app-pine);
      font-size: 44px;
      animation: pop 0.45s cubic-bezier(0.3, 1.5, 0.55, 1) both;
    }
    @keyframes pop {
      from {
        transform: scale(0.4);
        opacity: 0;
      }
    }
    h1 {
      margin: 0 0 10px;
      font-size: 1.7rem;
      font-weight: 750;
      line-height: 1.1;
    }
    p {
      max-width: 34ch;
      margin: 0 auto 28px;
      color: var(--app-ink-2);
      line-height: 1.5;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SentViewComponent {
  readonly home = output<void>();
  readonly another = output<void>();

  constructor() {
    addIcons({ checkmark });
  }
}
