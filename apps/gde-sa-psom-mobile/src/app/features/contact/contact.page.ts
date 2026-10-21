import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
import { IonInput } from '@ionic/angular/ion-input';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { NavController } from '@ionic/angular/nav-controller';
import { TranslocoPipe, TranslocoService } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { checkmark } from 'ionicons/icons';
import { Notifier } from '@gde/shared/data-access/core';
import { RouteConstants, SITE_ORIGIN } from '@gde/shared/util';
import { ExternalLinkService } from '../../core/platform/external-link.service';
import { GuardedForm } from '../../core/forms/leave-form';
import { ContactApi } from './contact.api';
import { CONTACT_LIMITS, contactErrorKey, emailAddress, requiredText, toContactMessage } from './contact-form';

type Field = 'email' | 'subject' | 'message';

/** The website's "Javite nam se" form: email, subject and message, sent to the team by email. */
@Component({
  selector: 'app-contact',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonTextarea,
    IonButton,
    IonSpinner,
    IonIcon,
    TranslocoPipe,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text="" [attr.aria-label]="'back' | transloco" />
        </ion-buttons>
        <ion-title>{{ 'contact' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="form-content">
      @if (sentTo(); as email) {
        <div class="sent" role="status">
          <div class="mark"><ion-icon name="checkmark" aria-hidden="true" /></div>
          <h1>{{ 'mobile_contact_sent_title' | transloco }}</h1>
          <p>{{ 'mobile_contact_sent_lead' | transloco: { email } }}</p>
          <ion-button expand="block" (click)="done()">{{ 'mobile_done' | transloco }}</ion-button>
          <ion-button expand="block" fill="clear" (click)="writeAnother()">
            {{ 'mobile_contact_another' | transloco }}
          </ion-button>
        </div>
      } @else {
        <p class="lead">{{ 'mobile_contact_lead' | transloco }}</p>
        <form [formGroup]="form" (ngSubmit)="submit()">
          <!-- Enter moves to the next field instead of sending a half-written message. -->
          <ion-input
            #emailInput
            formControlName="email"
            type="email"
            inputmode="email"
            autocomplete="email"
            autocapitalize="off"
            enterkeyhint="next"
            [spellcheck]="false"
            [maxlength]="limits.email"
            [label]="('mobile_contact_email' | transloco) + ' *'"
            labelPlacement="stacked"
            fill="outline"
            [placeholder]="'email_placeholder' | transloco"
            [errorText]="errorKey('email') | transloco"
            (keydown.enter)="focusNext($event, subjectInput)"
          />
          <ion-input
            #subjectInput
            formControlName="subject"
            autocomplete="off"
            autocapitalize="sentences"
            enterkeyhint="next"
            [spellcheck]="true"
            [maxlength]="limits.subject"
            [label]="('subject' | transloco) + ' *'"
            labelPlacement="stacked"
            fill="outline"
            [errorText]="errorKey('subject') | transloco"
            (keydown.enter)="focusNext($event, messageInput)"
          />
          <ion-textarea
            #messageInput
            formControlName="message"
            autocapitalize="sentences"
            [spellcheck]="true"
            [maxlength]="limits.message"
            [counter]="true"
            [autoGrow]="true"
            [rows]="6"
            [label]="('message' | transloco) + ' *'"
            labelPlacement="stacked"
            fill="outline"
            [errorText]="errorKey('message') | transloco"
          />
          <ion-button type="submit" expand="block" class="submit" [disabled]="sending()">
            @if (sending()) {
              <ion-spinner name="dots" [attr.aria-label]="'mobile_contact_sending' | transloco" />
            } @else {
              {{ 'mobile_contact_send' | transloco }}
            }
          </ion-button>
          <p class="note">
            {{ 'mobile_contact_privacy' | transloco }}
            <button type="button" class="policy" (click)="openPolicy()">{{ 'mobile_privacy' | transloco }}</button>
          </p>
        </form>
      }
    </ion-content>
  `,
  styles: `
    /* The suggest forms' layout (features/suggest/suggest.scss); the side insets are added back. */
    .form-content {
      --padding-start: calc(var(--app-gutter) + var(--app-safe-area-left));
      --padding-end: calc(var(--app-gutter) + var(--app-safe-area-right));
      --padding-top: 8px;
      --padding-bottom: 32px;
    }
    .lead {
      margin: 0 0 24px;
      color: var(--app-text-2);
      font-size: 1rem;
      line-height: 1.5;
    }
    ion-input,
    ion-textarea {
      margin-bottom: 20px;
    }
    .submit {
      margin: 28px 0 12px;
    }
    .note {
      margin: 0;
      color: var(--app-text-2);
      font-size: 0.8125rem;
      line-height: 1.5;
      text-align: center;
    }
    .policy {
      padding: 4px 0;
      border: 0;
      background: none;
      color: var(--app-primary-text);
      font: inherit;
      font-weight: 600;
      text-decoration: underline;
      text-underline-offset: 2px;
      cursor: pointer;
    }
    /* The sent state, as the suggest forms' thank-you view (shared/ui/sent-view). */
    .sent {
      padding: 56px 4px 24px;
      text-align: center;
    }
    .mark {
      display: grid;
      place-items: center;
      width: 72px;
      height: 72px;
      margin: 0 auto 24px;
      border-radius: 50%;
      background: var(--app-primary-soft);
      color: var(--app-on-primary-soft);
      font-size: 36px;
      animation: pop 0.4s cubic-bezier(0.3, 1.3, 0.55, 1) both;
    }
    @keyframes pop {
      from {
        transform: scale(0.6);
        opacity: 0;
      }
    }
    .sent h1 {
      margin: 0 0 12px;
    }
    .sent p {
      max-width: 34ch;
      margin: 0 auto 32px;
      color: var(--app-text-2);
      line-height: 1.55;
      overflow-wrap: anywhere;
    }
    .sent ion-button {
      margin: 0 0 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactPage implements GuardedForm {
  readonly #api = inject(ContactApi);
  readonly #notifier = inject(Notifier);
  readonly #transloco = inject(TranslocoService);
  readonly #nav = inject(NavController);
  readonly #links = inject(ExternalLinkService);

  readonly limits = CONTACT_LIMITS;
  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [requiredText, emailAddress, Validators.maxLength(CONTACT_LIMITS.email)]],
    subject: ['', [requiredText, Validators.maxLength(CONTACT_LIMITS.subject)]],
    message: ['', [requiredText, Validators.maxLength(CONTACT_LIMITS.message)]],
  });
  readonly sending = signal(false);
  /** The address the reply goes to, once the message is out: the sent state replaces the form. */
  readonly sentTo = signal<string | null>(null);

  private readonly content = viewChild(IonContent);
  private readonly emailField = viewChild<IonInput>('emailInput');
  private readonly subjectField = viewChild<IonInput>('subjectInput');
  private readonly messageField = viewChild<IonTextarea>('messageInput');

  /** Asked by leaveFormGuard when a written message would be left behind. */
  readonly discardTitle = 'mobile_leave_message_title';

  constructor() {
    addIcons({ checkmark });
  }

  hasUnsavedInput(): boolean {
    // While sending, the message is on its way: leaving loses nothing.
    if (this.sentTo() || this.sending()) return false;
    return Object.values(this.form.getRawValue()).some((value) => value.trim() !== '');
  }

  discard(): void {
    this.form.reset();
  }

  /** Shown by Ionic only while the field is touched and invalid; 'required' stands in otherwise. */
  errorKey(field: Field): string {
    return contactErrorKey(this.form.controls[field].errors) ?? 'required';
  }

  focusNext(event: Event, next: IonInput | IonTextarea): void {
    event.preventDefault();
    void next.setFocus();
  }

  submit(): void {
    this.form.markAllAsTouched();
    // Ionic copies ng-touched to ion-touched (which shows errorText) before Angular has
    // rendered the classes; repeat once the view has updated, as the suggest forms do.
    setTimeout(() => Object.values(this.form.controls).forEach((control) => control.markAsTouched()));
    if (this.sending()) return;
    if (this.form.invalid) {
      void this.#firstInvalidField()?.setFocus();
      return;
    }

    const message = toContactMessage(this.form.getRawValue());
    this.sending.set(true);
    // Not cancelled when the screen closes: leaving while it sends must not drop the message.
    this.#api.send(message).subscribe({
      next: () => {
        this.sending.set(false);
        this.form.reset();
        this.sentTo.set(message.from);
        void this.content()?.scrollToTop(300);
      },
      error: () => {
        this.sending.set(false);
        // The form keeps what was written, so sending again is one tap.
        this.#notifier.notify(
          this.#transloco.translate('mobile_contact_error'),
          'error',
          this.#transloco.translate('close'),
        );
      },
    });
  }

  done(): void {
    void this.#nav.navigateBack('/tabs/more');
  }

  writeAnother(): void {
    this.sentTo.set(null);
  }

  openPolicy(): void {
    void this.#links.openWeb(`${SITE_ORIGIN}/${RouteConstants.privacyPolicy}`);
  }

  #firstInvalidField(): IonInput | IonTextarea | undefined {
    const { email, subject } = this.form.controls;
    if (email.invalid) return this.emailField();
    if (subject.invalid) return this.subjectField();
    return this.messageField();
  }
}
