import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogContent, MatDialogActions, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-add-spot',
  imports: [   CommonModule,
      MatFormFieldModule,
      MatInputModule,
      FormsModule,
      MatDialogContent,
      MatDialogActions,
      MatButtonModule],
  templateUrl: './add-spot.component.html',
  styleUrl: './add-spot.component.scss',
})
export class AddSpotComponent {
    readonly dialogRef = inject(MatDialogRef<AddSpotComponent>);
    readonly data = inject<any>(MAT_DIALOG_DATA);
    constructor(){
      this.dialogRef
      .keydownEvents()
      .subscribe((event: KeyboardEvent) => {
      
        if (event.key === 'Escape') {
          this.onNoClick();
        }
      });
    }


    onNoClick(): void {
      this.dialogRef.close();
    }
}
