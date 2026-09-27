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
import { IonSelect } from '@ionic/angular/ion-select';
import { IonSelectOption } from '@ionic/angular/ion-select-option';
import { IonSpinner } from '@ionic/angular/ion-spinner';
import { IonTextarea } from '@ionic/angular/ion-textarea';
import { IonTitle } from '@ionic/angular/ion-title';
import { IonToolbar } from '@ionic/angular/ion-toolbar';
import { ModalController } from '@ionic/angular/modal-controller';
import { NavController } from '@ionic/angular/nav-controller';
import { TranslocoPipe } from '@ngneat/transloco';
import { SharedStore, SpotsStore, SuggestSpotPayload } from '@gde/shared/data-access';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '@gde/shared/util';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { PhotoFieldComponent } from '../../shared/ui/photo-field.component';
import { requiredValue } from '../../shared/forms';
import { SentViewComponent } from '../../shared/ui/sent-view.component';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';

@Component({
  selector: 'app-suggest-spot',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTextarea,
    IonItem,
    IonLabel,
    IonNote,
    IonButton,
    IonSpinner,
    TranslocoPipe,
    SentViewComponent,
    PhotoFieldComponent,
  ],
  templateUrl: './suggest-spot.page.html',
  styleUrl: './suggest.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestSpotPage {
  readonly spots = inject(SpotsStore);
  readonly shared = inject(SharedStore);
  private readonly modals = inject(ModalController);
  private readonly nav = inject(NavController);
  private readonly fb = inject(FormBuilder);
  private readonly analytics = inject(AnalyticsService);

  readonly spotTypeKey = descriptionToKeyMapSpot;
  readonly petSizeKey = descriptionToKeyMap;
  readonly gardenKey = descriptionToKeyMapGarden;

  readonly form = this.fb.group({
    iuo_ime: ['', Validators.required],
    iuo_adressa: ['', Validators.required],
    iuo_link_web: ['', Validators.required],
    iuo_telefon: [''],
    ops_id: this.fb.control<number | null>(null, Validators.required),
    ugo_id: this.fb.control<number | null>(null, Validators.required),
    sta_id: this.fb.control<number | null>(null, Validators.required),
    bas_id: this.fb.control<number | null>(null, Validators.required),
    iuo_opis: [''],
  });

  readonly photoOutside = signal<string | null>(null);
  readonly photoInside = signal<string | null>(null);
  readonly submitted = signal(false);
  readonly submitting = signal(false);
  /** The place went through: the thank-you view replaces the form. */
  readonly sent = signal(false);
  private readonly content = viewChild(IonContent);

  private readonly townshipId = toSignal(this.form.controls.ops_id.valueChanges, { initialValue: null });
  readonly townshipName = computed(() => {
    const id = this.townshipId();
    return id ? (this.shared.townships().find((t) => t.id === id)?.ime ?? null) : null;
  });

  constructor() {
    // Garden types are not loaded by SharedStore's init.
    if (!this.shared.gardens().length) this.shared.getGardenTypes();
  }

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
    const outside = this.photoOutside();
    if (this.form.invalid || !outside || this.submitting()) return;

    const v = this.form.getRawValue();
    const payload: SuggestSpotPayload = {
      iuo_ime: requiredValue(v.iuo_ime, 'iuo_ime').trim(),
      iuo_adressa: requiredValue(v.iuo_adressa, 'iuo_adressa').trim(),
      iuo_link_web: requiredValue(v.iuo_link_web, 'iuo_link_web').trim(),
      iuo_telefon: (v.iuo_telefon ?? '').trim(),
      iuo_opis: (v.iuo_opis ?? '').trim(),
      ops_id: requiredValue(v.ops_id, 'ops_id'),
      ugo_id: requiredValue(v.ugo_id, 'ugo_id'),
      sta_id: requiredValue(v.sta_id, 'sta_id'),
      bas_id: requiredValue(v.bas_id, 'bas_id'),
      iuo_slika: outside,
      iuo_slika_unutra: this.photoInside(),
    };

    this.submitting.set(true);
    this.spots.suggestSpot(
      payload,
      () => {
        this.submitting.set(false);
        this.#reset();
        this.sent.set(true);
        this.analytics.trackSubmission('spot');
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

  #reset(): void {
    this.form.reset();
    this.photoOutside.set(null);
    this.photoInside.set(null);
    this.submitted.set(false);
  }
}
