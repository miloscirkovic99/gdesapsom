import { AbstractControl, ValidatorFn } from '@angular/forms';

export function fileSizeValidator(maxSize: number): ValidatorFn {
  return (control: AbstractControl) => {
    const file = control.value;
    if (file && file.size > maxSize) {
      return { fileSize: true };
    }
    return null;
  };
}
