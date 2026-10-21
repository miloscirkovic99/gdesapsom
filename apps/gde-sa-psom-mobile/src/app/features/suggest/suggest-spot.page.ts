import { ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { IonButton } from '@ionic/angular/ion-button';
import { IonButtons } from '@ionic/angular/ion-buttons';
import { IonContent } from '@ionic/angular/ion-content';
import { IonFooter } from '@ionic/angular/ion-footer';
import { IonHeader } from '@ionic/angular/ion-header';
import { IonIcon } from '@ionic/angular/ion-icon';
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
import { Platform } from '@ionic/angular/platform';
import { TranslocoPipe } from '@ngneat/transloco';
import { addIcons } from 'ionicons';
import { arrowBackSharp, refreshOutline } from 'ionicons/icons';
import { debounceTime } from 'rxjs';
import { SharedStore, SpotsStore, SuggestSpotPayload } from '@gde/shared/data-access';
import { descriptionToKeyMap, descriptionToKeyMapGarden, descriptionToKeyMapSpot } from '@gde/shared/util';
import { AnalyticsService } from '../../core/analytics/analytics.service';
import { FormDraftService } from '../../core/forms/form-draft.service';
import { DiscardDialog, GuardedForm, MORE_ROOT } from '../../core/forms/leave-form';
import { PhotoFieldComponent } from '../../shared/ui/photo-field.component';
import { requiredValue } from '../../shared/forms';
import { SentViewComponent } from '../../shared/ui/sent-view.component';
import { TownshipPickerComponent } from '../../shared/ui/township-picker.component';
import { firstIncompleteStep, isStepComplete, resumeStep, SPOT_STEPS, SpotControl } from './spot-steps';

const DRAFT = 'suggest-spot';
const ROUTE = '/tabs/more/suggest-spot';
const REVIEW = SPOT_STEPS.length - 1;

type PhotoSlot = 'outside' | 'inside';

/** The form's value as the draft keeps it. */
interface SpotDraftValues {
  iuo_ime: string | null;
  iuo_adressa: string | null;
  iuo_link_web: string | null;
  iuo_telefon: string | null;
  iuo_opis: string | null;
  ops_id: number | null;
  ugo_id: number | null;
  sta_id: number | null;
  bas_id: number | null;
}

/** A line of the review step: a translated label and the answer (or a key to translate). */
interface ReviewRow {
  label: string;
  value: string | null;
  translate?: boolean;
}

/**
 * Suggest a place, one topic per step, with a review before sending. What is
 * typed is kept as a draft, so leaving the app (to copy a link, say) loses
 * nothing; leaving the form inside the app asks first (leaveFormGuard).
 */
@Component({
  selector: 'app-suggest-spot',
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonTitle,
    IonContent,
    IonFooter,
    IonIcon,
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
  styleUrls: ['./suggest.scss', './suggest-steps.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuggestSpotPage implements GuardedForm {
  readonly spots = inject(SpotsStore);
  readonly shared = inject(SharedStore);
  private readonly modals = inject(ModalController);
  private readonly nav = inject(NavController);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly analytics = inject(AnalyticsService);
  private readonly drafts = inject(FormDraftService);
  private readonly discardDialog = inject(DiscardDialog);

  readonly spotTypeKey = descriptionToKeyMapSpot;
  readonly petSizeKey = descriptionToKeyMap;
  readonly gardenKey = descriptionToKeyMapGarden;
  readonly steps = SPOT_STEPS;

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

  readonly step = signal(0);
  readonly current = computed(() => SPOT_STEPS[this.step()]);
  readonly isReview = computed(() => this.step() === REVIEW);
  /** Once the review has been seen, Next on an earlier step goes straight back to it. */
  readonly reviewSeen = signal(false);
  /** Next was tapped on this step with something missing: show the non-field errors. */
  readonly showErrors = signal(false);
  /** The form opened with a saved draft. */
  readonly restored = signal(false);

  readonly photoOutside = signal<string | null>(null);
  readonly photoInside = signal<string | null>(null);
  readonly submitting = signal(false);
  /** The place went through: the thank-you view replaces the form. */
  readonly sent = signal(false);

  private readonly content = viewChild(IonContent);
  private readonly stepTitle = viewChild<ElementRef<HTMLElement>>('stepTitle');

  private readonly values = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });
  readonly townshipName = computed(() => {
    const id = this.values().ops_id;
    return id ? (this.shared.townships().find((t) => t.id === id)?.ime ?? null) : null;
  });

  /** The answers per step, for the review. */
  readonly review = computed(() => {
    const v = this.values();
    const typeName = this.shared.spotTypes().find((t) => t.id === v.ugo_id)?.ime ?? null;
    const sizeName = this.spots.allowed().find((s) => s.id === v.sta_id)?.ime ?? null;
    const gardenName = this.shared.gardens().find((g) => g.id === v.bas_id)?.ime ?? null;
    const named = (name: string | null, keys: Record<string, string>): ReviewRow['value'] =>
      name ? (keys[name] ?? name) : null;
    const rows: ReviewRow[][] = [
      [
        { label: 'spot_name', value: v.iuo_ime?.trim() || null },
        { label: 'spot_type', value: named(typeName, this.spotTypeKey), translate: !!typeName && !!this.spotTypeKey[typeName] },
        { label: 'address', value: v.iuo_adressa?.trim() || null },
        { label: 'township', value: this.townshipName() },
      ],
      [
        { label: 'pet_size', value: named(sizeName, this.petSizeKey), translate: !!sizeName && !!this.petSizeKey[sizeName] },
        { label: 'garden', value: named(gardenName, this.gardenKey), translate: !!gardenName && !!this.gardenKey[gardenName] },
        { label: 'short_description', value: v.iuo_opis?.trim() || null },
      ],
      [
        { label: 'site_network', value: v.iuo_link_web?.trim() || null },
        { label: 'phone', value: v.iuo_telefon?.trim() || null },
      ],
    ];
    return rows.map((list, index) => ({ step: index, label: SPOT_STEPS[index].label, rows: list }));
  });

  constructor() {
    addIcons({ arrowBackSharp, refreshOutline });
    // Garden types are not loaded by SharedStore's init.
    if (!this.shared.gardens().length) this.shared.getGardenTypes();

    // Keep the draft current while typing, and at once when the app goes to the background.
    this.form.valueChanges.pipe(debounceTime(400), takeUntilDestroyed()).subscribe(() => this.#persist());
    const pause = App.addListener('pause', () => this.#persist());

    // Android back: the previous step first, then out of the form (through leaveFormGuard).
    const back = inject(Platform).backButton.subscribeWithPriority(10, (processNextHandler) => {
      if (this.router.url.split('?')[0] === ROUTE) this.back();
      else processNextHandler();
    });

    inject(DestroyRef).onDestroy(() => {
      back.unsubscribe();
      void pause.then((handle) => handle.remove());
    });

    void this.#restore();
  }

  hasUnsavedInput(): boolean {
    if (this.sent()) return false;
    const filled = Object.values(this.form.getRawValue()).some((value) =>
      typeof value === 'string' ? value.trim() !== '' : value !== null,
    );
    return filled || !!this.photoOutside() || !!this.photoInside();
  }

  discard(): void {
    this.drafts.clear(DRAFT);
    this.#reset();
  }

  /** Toolbar and Android back. */
  back(): void {
    if (!this.sent() && this.step() > 0) this.#goTo(this.step() - 1);
    else void this.nav.navigateBack(MORE_ROOT);
  }

  next(): void {
    if (this.isReview()) {
      this.submit();
      return;
    }
    if (!this.#checkStep()) return;
    this.#goTo(this.reviewSeen() ? REVIEW : this.step() + 1);
  }

  /** From the review: change one section. */
  edit(step: number): void {
    this.#goTo(step);
  }

  async startOver(): Promise<void> {
    if (await this.discardDialog.confirm()) this.discard();
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

  setPhoto(slot: PhotoSlot, photo: string | null): void {
    (slot === 'outside' ? this.photoOutside : this.photoInside).set(photo);
    this.drafts.savePhoto(DRAFT, slot, photo);
    this.#persist();
  }

  submit(): void {
    if (this.submitting()) return;
    const missing = firstIncompleteStep(SPOT_STEPS, (c) => this.#isValid(c), !!this.photoOutside());
    if (missing !== -1) {
      this.#goTo(missing);
      this.#markTouched(SPOT_STEPS[missing].controls);
      this.showErrors.set(true);
      return;
    }

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
      iuo_slika: requiredValue(this.photoOutside(), 'iuo_slika'),
      iuo_slika_unutra: this.photoInside(),
    };

    this.submitting.set(true);
    this.spots.suggestSpot(
      payload,
      () => {
        this.submitting.set(false);
        this.discard();
        this.sent.set(true);
        this.analytics.trackSubmission('spot');
        void this.content()?.scrollToTop(300);
      },
      () => this.submitting.set(false),
      // The thank-you view is the confirmation.
      false,
    );
  }

  /** Leave the form (off the More stack) and show Home. */
  async goHome(): Promise<void> {
    await this.nav.navigateBack(MORE_ROOT);
    void this.nav.navigateRoot('/tabs/home', { animated: false });
  }

  addAnother(): void {
    this.sent.set(false);
  }

  #goTo(step: number): void {
    this.step.set(step);
    this.showErrors.set(false);
    if (step === REVIEW) this.reviewSeen.set(true);
    this.#persist();
    void this.content()?.scrollToTop(200);
    // Screen readers start at the new step's question.
    setTimeout(() => this.stepTitle()?.nativeElement.focus());
  }

  /** Marks the step's fields so their errors show; true when it is complete. */
  #checkStep(): boolean {
    const step = this.current();
    this.#markTouched(step.controls);
    const complete = isStepComplete(step, (c) => this.#isValid(c), !!this.photoOutside());
    this.showErrors.set(!complete);
    return complete;
  }

  #markTouched(controls: readonly SpotControl[]): void {
    controls.forEach((name) => this.form.controls[name].markAsTouched());
    // Ionic copies ng-touched to ion-touched (which shows errorText) from its patched
    // markAsTouched, but reads the classes before Angular has rendered them. Repeat once
    // the view has updated.
    setTimeout(() => controls.forEach((name) => this.form.controls[name].markAsTouched()));
  }

  #isValid(control: SpotControl): boolean {
    return this.form.controls[control].valid;
  }

  #persist(): void {
    if (this.hasUnsavedInput()) this.drafts.save<SpotDraftValues>(DRAFT, this.form.getRawValue(), this.step());
    else this.drafts.clear(DRAFT);
  }

  async #restore(): Promise<void> {
    const [draft, outside, inside] = await Promise.all([
      this.drafts.load<Partial<SpotDraftValues>>(DRAFT),
      this.drafts.loadPhoto(DRAFT, 'outside'),
      this.drafts.loadPhoto(DRAFT, 'inside'),
    ]);
    if (!draft && !outside && !inside) return;
    if (draft) this.form.patchValue(draft.values);
    this.photoOutside.set(outside);
    this.photoInside.set(inside);
    const step = resumeStep(draft?.step ?? 0, SPOT_STEPS, (c) => this.#isValid(c), !!outside);
    this.step.set(step);
    if (step === REVIEW) this.reviewSeen.set(true);
    this.restored.set(this.hasUnsavedInput());
  }

  #reset(): void {
    this.form.reset();
    this.photoOutside.set(null);
    this.photoInside.set(null);
    this.step.set(0);
    this.reviewSeen.set(false);
    this.showErrors.set(false);
    this.restored.set(false);
  }
}
