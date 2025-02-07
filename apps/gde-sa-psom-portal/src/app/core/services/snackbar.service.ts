import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  snackbarRef: any;
  constructor(private snackbar: MatSnackBar) { }
  openSnackbar(
    message?: string,
    action?: string,
    panelClass?: any,
    duration=5000,
  ) {
    this.snackbarRef = this.snackbar.open(message as string, action as string, { duration: duration, panelClass: panelClass });
  }
  getSnackbarRef() {
    return this.snackbarRef;
  }
}
