import { Component, effect, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import {
  MatDialogContent,
  MatDialogActions,
  MatDialogRef,
  MAT_DIALOG_DATA,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@ngneat/transloco';
import { MatSelect, MatSelectModule } from '@angular/material/select';
import { NgxMatSelectSearchModule } from 'ngx-mat-select-search';
import {
  descriptionToKeyMap,
  descriptionToKeyMapGarden,
  descriptionToKeyMapSpot,
} from '../../helpers/map.helpers';
import { SpotsStore } from '../../store/spots.store';
import { SharedStore } from '../../store/shared.store';
import { ReplaySubject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-add-spot',
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    TranslocoModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatSelectModule,
    NgxMatSelectSearchModule,
  ],
  templateUrl: './add-spot.component.html',
  styleUrl: './add-spot.component.scss',
})
export class AddSpotComponent {
  readonly dialogRef = inject(MatDialogRef<AddSpotComponent>);
  readonly data = inject<any>(MAT_DIALOG_DATA);
  @ViewChild('multiSelect', { static: true }) multiSelect!: MatSelect;
  private destroyed$: ReplaySubject<boolean> = new ReplaySubject(1);

  /** control for the MatSelect filter keyword multi-selection */
  public townshipMultiFilterCtrl = new FormControl<string>('');

  /** list of tonwhips filtered by search keyword */
  public filteredtownshipsMulti: ReplaySubject<any[]> = new ReplaySubject<
    any[]
  >(1);

  spotForm!: FormGroup;
  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;

  spotsStore = inject(SpotsStore);
  sharedStore = inject(SharedStore);
  constructor(private fb: FormBuilder) {
    this.dialogRef.keydownEvents().subscribe((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.onNoClick();
      }
    });

    this.spotForm = this.fb.group({
      iuo_ime: ['', Validators.required],
      iuo_adressa: ['', Validators.required],
      iuo_link_web: ['', Validators.required],
      iuo_slika: ['', Validators.required],
      iuo_slika_unutra: [''],
      iuo_telefon: [''],
      ops_id: ['', Validators.required],
      ugo_id: ['', Validators.required],
      sta_id: ['', Validators.required],
      bas_id: ['', Validators.required],
      iuo_opis: [''],
    });
    // listen for search field value changes
    this.townshipMultiFilterCtrl.valueChanges
      .pipe(takeUntil(this.destroyed$))
      .subscribe(() => {
        this.filterTownshipsMulti();
      });
    effect(() => {
      if (this.sharedStore.townships().length) {
        this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());
      }
    });
  }

  // Metod za obradu fajla
  onFileChangeOutside(event: any): void {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        // Ovde se postavlja base64 string
        const base64String = reader.result as any;
        this.spotForm.get('iuo_slika')?.setValue(base64String);
      };

      reader.readAsDataURL(file);
    }
  }
 

  // Metod za obradu fajla
  onFileChangeInside(event: any): void {
    const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = () => {
        // Ovde se postavlja base64 string
        const base64String = reader.result as any;
        this.spotForm.get('iuo_slika_unutra')?.setValue(base64String);
      };

      reader.readAsDataURL(file);
    }
  }
  protected filterTownshipsMulti() {
    if (!this.sharedStore.townships()) {
      return;
    }
    let search = this.townshipMultiFilterCtrl.value;
    if (!search) {
      this.filteredtownshipsMulti.next(this.sharedStore.townships().slice());
      return;
    } else {
      search = search.toLowerCase();
    }
    this.filteredtownshipsMulti.next(
      this.sharedStore.townships().filter((township: any) =>
        township.ime.toLowerCase().includes(search)
      )
    );
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  onSaveClick(): void {
    if (this.spotForm.valid) {
      console.log(this.spotForm.value);
      this.spotsStore.suggestSpot(this.spotForm)
    } else {
      console.log('Form is invalid');
    }
  }
}
