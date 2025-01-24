import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogContent, MatDialogActions, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslocoModule } from '@ngneat/transloco';

@Component({
  selector: 'app-add-spot',
  imports: [   CommonModule,
      MatFormFieldModule,
      MatInputModule,
      FormsModule,
      MatDialogContent,
      MatDialogActions,
      MatButtonModule,
      TranslocoModule,
      ReactiveFormsModule,
      FormsModule
    ],
  templateUrl: './add-spot.component.html',
  styleUrl: './add-spot.component.scss',
})
export class AddSpotComponent {
    readonly dialogRef = inject(MatDialogRef<AddSpotComponent>);
    readonly data = inject<any>(MAT_DIALOG_DATA);
    spotForm!: FormGroup;

    constructor(private fb: FormBuilder){
      this.dialogRef
      .keydownEvents()
      .subscribe((event: KeyboardEvent) => {
      
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

        // ops_id: ['', Validators.required],
        // ugo_id: ['', Validators.required],
        // sta_id: ['', Validators.required],
        // bas_id: ['', Validators.required],
        iuo_opis: ['']
      });
    }

  // Metod za obradu fajla
  onFileChangeOutside(event: any): void {
    const file = event.target.files[0];
    
    if (file) {
      const reader = new FileReader();
      
      reader.onload = () => {
        // Ovdje se postavlja base64 string
        const base64String = reader.result as string;
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
          // Ovdje se postavlja base64 string
          const base64String = reader.result as string;
          this.spotForm.get('iuo_slika_unutra')?.setValue(base64String);
        };
        
        reader.readAsDataURL(file);
      }
    }
    onNoClick(): void {
      this.dialogRef.close();
    }
    onSaveClick(): void {
      if (this.spotForm.valid) {
        console.log(this.spotForm.value);
      } else {
        console.log('Form is invalid');
      }
    }
}
