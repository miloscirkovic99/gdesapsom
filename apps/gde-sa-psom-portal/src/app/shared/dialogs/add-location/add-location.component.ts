import { Component, effect, inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  AbstractControl,
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
import { MatRadioModule } from '@angular/material/radio';
import { fileSizeValidator } from '../../../core/validators/file-size-valdiator';
import { filterTownshipsMulti } from '../../utils/township.util';

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
    MatRadioModule,
  ],
  templateUrl: './add-location.component.html',
  styleUrl: './add-location.component.scss',
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
  parkForm!: FormGroup;

  descriptionToKeyMap = descriptionToKeyMap;
  descriptionToKeyMapSpot = descriptionToKeyMapSpot;
  descriptionToKeyMapGarden = descriptionToKeyMapGarden;

  spotsStore = inject(SpotsStore);
  sharedStore = inject(SharedStore);
  imageSrc: any;
  imageSrcAdditional: any;
  selectedType: string = 'spot'; // Default to Spot

  constructor(private fb: FormBuilder) {
    this.dialogRef.keydownEvents().subscribe((event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.onNoClick();
      }
    });
    this.initSpotForm();
    this.initParkForm();
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
  ngOnInit(): void {
    this.sharedStore.getGardenTypes()
    
  }
  changeRadio(event: any) {
    this.selectedType = event.value;
  }
  initParkForm() {
    this.parkForm = this.fb.group({
      par_ime: [this.data.data?.par_ime, Validators.required],
      par_lokacija: [this.data.data?.par_lokacija, Validators.required],
      ops_id: [this.data.data?.ops_id, Validators.required],
      par_opis: [this.data.data?.par_opis],
      par_accepted: [0],
    });
  }
  initSpotForm() {
    this.spotForm = this.fb.group({
      iuo_ime: [this.data.data?.iuo_ime, Validators.required],
      iuo_adressa: [this.data.data?.iuo_adressa, Validators.required],
      iuo_link_web: [this.data.data?.iuo_link_web, Validators.required],
      iuo_slika: [this.data.data?.iuo_slika_base64, Validators.required],
      iuo_slika_unutra: [this.data.data?.iuo_slika_base64_unutra],
      iuo_telefon: [this.data.data?.iuo_telefon],
      ops_id: [this.data.data?.ops_id, Validators.required],
      ugo_id: [this.data.data?.ugo_id, Validators.required],
      sta_id: [this.data.data?.sta_id, Validators.required],
      bas_id: [this.data.data?.bas_id, Validators.required],
      iuo_opis: [this.data.data?.iuo_opis],
    });

    if (this.data.isEdit) {
      const controlName = this.data?.isPending ? 'pr_id' : 'iuo_id';
      this.spotForm.addControl(
        controlName,
        new FormControl(this.data.data?.[controlName])
      );
    }

    this.imageSrc = this.spotForm.get('iuo_slika')?.value;
    this.imageSrcAdditional = this.spotForm.get('iuo_slika_unutra')?.value;
  }


  handleInputChange(e: any, controlName: string) {
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files[0];
  
    if (!this.isValidFile(file)) {
      alert('Invalid format. Please upload an image.');
      return;
    }
  
    const maxSize = 1 * 1024 * 1024; // 1MB
  
    if (file.size > maxSize) {
      alert('File size exceeds the limit. Please upload a smaller image.');
      return;
    }
  
    // Update the form control with the file and validate
    this.updateFormControl(controlName, file, maxSize);
  
    // Read and process the image
    this.readFileAsBase64(file, controlName);
  }
  
  // Helper function to check file type
  private isValidFile(file: File): any {
    const pattern = /image-*/;
    return file.type.match(pattern);
  }
  
  // Helper function to update the form control with file and validation
  private updateFormControl(controlName: string, file: File, maxSize: number) {
    const control = this.spotForm.get(controlName);
    if (control) {
      control.setValue(file);  // Store the File object in the form control
      control.setValidators([fileSizeValidator(maxSize)]);  // Apply file size validator
      control.updateValueAndValidity();  // Trigger validation
    }
  }
  
  // Helper function to read file as a base64 string
  private readFileAsBase64(file: File, controlName: string) {
    const reader = new FileReader();
    reader.onload = (event: any) => {
      const base64String = event.target.result;
      // Store base64 string based on control name
      if (controlName === 'iuo_slika') {
        this.imageSrc = base64String;
      } else if (controlName === 'iuo_slika_unutra') {
        this.imageSrcAdditional = base64String;
      }
    };
    reader.readAsDataURL(file);
  }
  protected filterTownshipsMulti() {
    const search: any = this.townshipMultiFilterCtrl.value;
    const filteredTownships = filterTownshipsMulti(this.sharedStore, search);

    this.filteredtownshipsMulti.next(filteredTownships);
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  disableButton(): boolean {
    if (
      (this.spotForm.invalid || !this.spotForm.dirty) &&
      (this.parkForm.invalid || !this.parkForm.dirty)
    ) {
      return true;
    }
    return false;
  }
  onSaveClick(): void {
    if (this.spotForm.valid || this.parkForm.valid) {
      const spotForm = {
        ...this.spotForm.value,
        iuo_slika: this.imageSrc,
        iuo_slika_unutra: this.imageSrcAdditional,
      };
      const dataOnSave = {
        form: this.selectedType === 'spot' ? spotForm : this.parkForm.value,
        spotType: this.selectedType,
      };
      this.data.onSave(dataOnSave);
    }
  }
}
