import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonBackButton } from '@ionic/angular/ion-back-button';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonInput } from '@ionic/angular/ion-input';
import { IonItem } from '@ionic/angular/ion-item';
import { IonLabel } from '@ionic/angular/ion-label';
import { IonNote } from '@ionic/angular/ion-note';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import { NavController } from '@ionic/angular/nav-controller';
import { TranslocoPipe } from '@ngneat/transloco';
import { ParksStore, SharedStore, SuggestParkPayload } from '@gde/shared/data-access';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { requiredValue } from '../../shared/forms';
import { SentViewComponent } from '../../shared/ui/sent-view.component';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';

@Component({
  selector: 'app-suggest-park',
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
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonSpinner,
    TranslocoPipe,
    SentViewComponent,
  ],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/more" text="" />
        </ion-buttons>
        <ion-title>{{ 'add_park' | transloco }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (sent()) {
        <app-sent-view (home)="goHome()" (another)="addAnother()" />
      } @else {
      <p class="lead">{{ 'lp_add_lead' | transloco }}</p>
      <form [formGroup]="form" (ngSubmit)="submit()">
        <ion-input
          formControlName="par_ime"
          [label]="('spot_name' | transloco) + ' *'"
          labelPlacement="stacked"
          fill="outline"
          autocapitalize="sentences"
          [errorText]="'required' | transloco"
        />
        <ion-input
          formControlName="par_lokacija"
          [label]="('address' | transloco) + ' *'"
          labelPlacement="stacked"
          fill="outline"
          autocapitalize="sentences"
          [errorText]="'required' | transloco"
        />
        <ion-item
          button
          detail="true"
          lines="none"
          class="picker"
          [class.picker-invalid]="submitted() && form.controls.ops_id.invalid"
          (click)="pickTownship()"
        >
          <ion-label>
            <p>{{ 'township' | transloco }} *</p>
            <h3>{{ townshipName() ?? ('select_city' | transloco) }}</h3>
          </ion-label>
        </ion-item>
        @if (submitted() && form.controls.ops_id.invalid) {
          <ion-note color="danger" class="field-error">{{ 'required' | transloco }}</ion-note>
        }
        <ion-textarea
          formControlName="par_opis"
          [label]="'short_description' | transloco"
          labelPlacement="stacked"
          fill="outline"
          [autoGrow]="true"
          [rows]="3"
          autocapitalize="sentences"
        />
        <ion-button type="submit" expand="block" class="submit" [disabled]="submitting()">
          @if (submitting()) {
            <ion-spinner name="dots" />
          } @else {
            {{ 'mobile_send' | transloco }}
          }
        </ion-button>
      </form>
      }
    </ion-content>
  `,
  styleUrl: './suggest.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestParkPage {
  readonly parks = inject(ParksStore);
  readonly shared = inject(SharedStore);
  private readonly modals = inject(ModalController);
  private readonly nav = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly analytics = inject(AnalyticsService);

  readonly form = this.fb.group({
    par_ime: ['', Validators.required],
    par_lokacija: ['', Validators.required],
    ops_id: this.fb.control<number | null>(null, Validators.required),
    par_opis: [''],
  });
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  /** The park went through: the thank-you view replaces the form. */
  readonly sent = signal(false);
  private readonly content = viewChild(IonContent);

  private readonly townshipId = toSignal(this.form.controls.ops_id.valueChanges, { initialValue: null });
  readonly townshipName = computed(() => {
    const id = this.townshipId();
    return id ? (this.shared.townships().find((t) => t.id === id)?.ime ?? null) : null;
  });

  async pickTownship(): Promise<void> {
    const current = this.form.controls.ops_id.value;
    const modal = await this.modals.create({
      component: TownshipPickerComponent,
      componentProps: {
        townships: this.shared.townships(),
        selected: current ? [current] : [],
        multiple: false,
        title: 'township',
      },
    });
    await modal.present();
    const { data, role } = await modal.onWillDismiss<number[]>();
    if (role === 'confirm' && data?.length) this.form.controls.ops_id.setValue(data[0]);
    this.form.controls.ops_id.markAsTouched();
  }

  submit(): void {
    this.submitted.set(true);
    this.form.markAllAsTouched();
    // Ionic copies ng-touched to ion-touched (which shows errorText) from its patched
    // markAsTouched, but reads the classes before Angular has rendered them. Repeat once
    // the view has updated.
    setTimeout(() => Object.values(this.form.controls).forEach((control) => control.markAsTouched()));
    if (this.form.invalid || this.submitting()) return;

    const v = this.form.getRawValue();
    const payload: SuggestParkPayload = {
      par_ime: requiredValue(v.par_ime, 'par_ime').trim(),
      par_lokacija: requiredValue(v.par_lokacija, 'par_lokacija').trim(),
      ops_id: requiredValue(v.ops_id, 'ops_id'),
      par_opis: (v.par_opis ?? '').trim(),
      // Visitors' parks wait for an admin.
      par_accepted: 0,
    };

    this.submitting.set(true);
    this.parks.addPark(
      payload,
      () => {
        this.submitting.set(false);
        this.form.reset();
        this.submitted.set(false);
        this.sent.set(true);
        this.analytics.trackSubmission('park');
        void this.content()?.scrollToTop(300);
      },
      () => this.submitting.set(false),
    );
  }

  /** Leave the form (off the More stack) and show Home. */
  async goHome(): Promise<void> {
    await this.nav.navigateBack('/tabs/more');
    void this.nav.navigateRoot('/tabs/home', { animated: false });
  }

  addAnother(): void {
    this.sent.set(false);
  }
}
