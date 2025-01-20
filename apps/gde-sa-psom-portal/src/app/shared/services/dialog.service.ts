import { Injectable, Type } from '@angular/core';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';

@Injectable({
  providedIn: 'root',
})
export class DialogService {
  private dialogRef!: MatDialogRef<any>;
  constructor(private dialog: MatDialog) {}

  openDialog<T>(
    component: Type<T>,
    data: any,
    configOverrides: object = {}
  ): void {
    // Close the currently opened dialog if it exists
    if (this.dialogRef) {
      this.dialogRef.close();
    }
    const config = {
      autoFocus: false,
      disableClose: true,
      enterAnimationDuration: 350,
      exitAnimationDuration: 300,
      // minWidth: '40rem',
      maxWidth:'45rem',
      backdropClass: 'dialogBackdropBackground',
      data: data,

    };

    this.dialogRef = this.dialog.open(component, {
      ...config,
      ...configOverrides,
    });
  }
  closeDialog() {
    this.dialogRef?.close();
  }
}
