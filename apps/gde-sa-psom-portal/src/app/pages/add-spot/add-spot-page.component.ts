import { Component, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import { TranslocoModule } from '@ngneat/transloco';
import { Router } from '@angular/router';
import { ReplaySubject, takeUntil } from 'rxjs';
import {
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
} from '../../shared/helpers/map.helpers';
import { SpotsStore } from '../../shared/store/spots.store';
import { SharedStore } from '../../shared/store/shared.store';
import { fileSizeValidator } from '../../core/validators/file-size-valdiator';
import { filterTownshipsMulti } from '../../shared/utils/township.util';
import { RouteConstants } from '../../shared/constants/route.constant';
import { ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-add-spot-page',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    ReactiveFormsModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
    TranslocoModule,
  ],
  templateUrl: './add-spot-page.component.html',
  styleUrl: './add-spot-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddSpotPageComponent {
  @ViewChild('multiSelect', { static: true }) multiSelect!: MatSelect;
  private destroyed$ = new ReplaySubject<boolean>(1);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  readonly spotsStore = inject(SpotsStore);
  readonly sharedStore = inject(SharedStore);

  townshipMultiFilterCtrl = new FormControl<string>('');
  filteredtownshipsMulti = new ReplaySubject<any[]>(1);

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;

  spotForm!: FormGroup;
  imageSrc = signal<string | null>(null);
  imageSrcAdditional = signal<string | null>(null);
  imageLoading = signal<string | null>(null);
  submitting = signal(false);

  constructor() {
    this.initSpotForm();

    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => this.filterTownships());

    effect(() => {
      if (this.sharedStore.townships().length) {
        this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());
      }
    });
  }

  ngOnInit(): void {
    this.sharedStore.getGardenTypes();
  }

  ngOnDestroy(): void {
    this.destroyed$.next(true);
    this.destroyed$.complete();
  }

  initSpotForm() {
    this.spotForm = this.fb.group({
      iuo_ime: ['', Validators.required],
      iuo_adressa: ['', Validators.required],
      iuo_link_web: ['', Validators.required],
      iuo_slika: [null, Validators.required],
      iuo_slika_unutra: [null],
      iuo_telefon: [''],
      ops_id: [null, Validators.required],
      ugo_id: [null, Validators.required],
      sta_id: [null, Validators.required],
      bas_id: [null, Validators.required],
      iuo_opis: [''],
    });
  }

  handleInputChange(e: Event, controlName: string) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file) return;

    const pattern = /image-*/;
    if (!file.type.match(pattern)) return;

    const maxSize = 1 * 1024 * 1024;
    if (file.size > maxSize) return;

    const control = this.spotForm.get(controlName);
    if (control) {
      control.setValue(file);
      control.setValidators([fileSizeValidator(maxSize)]);
      control.updateValueAndValidity();
    }

    this.imageLoading.set(controlName);
    const reader = new FileReader();
    reader.onload = (event: ProgressEvent<FileReader>) => {
      const base64 = event.target?.result as string;
      if (controlName === 'iuo_slika') {
        this.imageSrc.set(base64);
      } else if (controlName === 'iuo_slika_unutra') {
        this.imageSrcAdditional.set(base64);
      }
      this.imageLoading.set(null);
    };
    reader.readAsDataURL(file);
  }

  removeImage(controlName: string) {
    this.spotForm.patchValue({ [controlName]: null });
    if (controlName === 'iuo_slika') {
      this.imageSrc.set(null);
    } else {
      this.imageSrcAdditional.set(null);
    }
  }

  onSave(): void {
    if (this.spotForm.valid) {
      this.submitting.set(true);
      const formData = {
        ...this.spotForm.value,
        iuo_slika: this.imageSrc(),
        iuo_slika_unutra: this.imageSrcAdditional(),
      };
      this.spotsStore.suggestSpot(formData, () => {
        this.submitting.set(false);
        this.router.navigate(['/' + RouteConstants.allSpots]);
      }, () => {
        this.submitting.set(false);
      });
    }
  }

  onCancel(): void {
    this.router.navigate(['/' + RouteConstants.allSpots]);
  }

  protected filterTownships() {
    const search = this.townshipMultiFilterCtrl.value ?? '';
    this.filteredtownshipsMulti.next(
      filterTownshipsMulti(this.sharedStore, search)
    );
  }
}
