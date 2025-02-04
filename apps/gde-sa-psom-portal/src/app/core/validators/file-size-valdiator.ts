import { AbstractControl, ValidatorFn } from '@angular/forms';

export function fileSizeValidator(maxSize: number): ValidatorFn {
  return (control: AbstractControl) => {
    const file = control.value as File;

    if (file && file.size > maxSize) {
      return { fileSize: true }; // Return validation error
    }
    return null; // No error
  };
}
