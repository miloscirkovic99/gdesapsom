import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Longest values the form accepts; the fields stop typing there too (maxlength). */
export const CONTACT_LIMITS = { email: 254, subject: 120, message: 3000 } as const;

/** What the website's contact form sends to `gmail` (ContactFormService). */
export interface ContactMessage {
  /** The visitor's address: the reply goes there. */
  from: string;
  subject: string;
  message: string;
}

/** A name, a dot-separated domain with at least two parts, no spaces. */
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

/** Like Validators.required, but text that is only spaces counts as empty. */
export const requiredText: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  String(control.value ?? '').trim() ? null : { required: true };

/**
 * An address the reply can reach. Stricter than Validators.email, which lets
 * "ime@gmail" through; spaces a keyboard adds around it are ignored.
 */
export const emailAddress: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const value = String(control.value ?? '').trim();
  return !value || EMAIL.test(value) ? null : { email: true };
};

/** The translation key for a field's first error, or null when it has none. */
export function contactErrorKey(errors: ValidationErrors | null | undefined): string | null {
  if (!errors) return null;
  if (errors['required']) return 'required';
  if (errors['email']) return 'mobile_contact_email_invalid';
  if (errors['maxlength']) return 'mobile_contact_too_long';
  return null;
}

/** The request body, trimmed. Call only once the form is valid. */
export function toContactMessage(value: {
  email?: string | null;
  subject?: string | null;
  message?: string | null;
}): ContactMessage {
  return {
    from: (value.email ?? '').trim(),
    subject: (value.subject ?? '').trim(),
    message: (value.message ?? '').trim(),
  };
}
