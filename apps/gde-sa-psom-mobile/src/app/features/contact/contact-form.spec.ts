import { FormControl, Validators } from '@angular/forms';
import { contactErrorKey, emailAddress, requiredText, toContactMessage } from './contact-form';

describe('requiredText', () => {
  it('treats spaces as empty', () => {
    expect(requiredText(new FormControl('   '))).toEqual({ required: true });
    expect(requiredText(new FormControl(null))).toEqual({ required: true });
    expect(requiredText(new FormControl(' Zdravo '))).toBeNull();
  });
});

describe('emailAddress', () => {
  const check = (value: string | null) => emailAddress(new FormControl(value));

  it('accepts ordinary addresses, ignoring spaces around them', () => {
    expect(check('ime.prezime@primer.co.rs')).toBeNull();
    expect(check(' ime@gmail.com ')).toBeNull();
  });

  it('rejects what a reply cannot reach', () => {
    for (const value of ['ime', 'ime@gmail', 'ime@.com', 'ime@gmail..com', 'ime prezime@gmail.com', '@gmail.com']) {
      expect(check(value)).toEqual({ email: true });
    }
  });

  it('leaves an empty field to requiredText', () => {
    expect(check('')).toBeNull();
    expect(check(null)).toBeNull();
  });
});

describe('contactErrorKey', () => {
  it('names the first problem of a field', () => {
    expect(contactErrorKey(null)).toBeNull();
    expect(contactErrorKey({ required: true, email: true })).toBe('required');
    expect(contactErrorKey({ email: true })).toBe('mobile_contact_email_invalid');
    expect(contactErrorKey(Validators.maxLength(3)(new FormControl('abcd')))).toBe('mobile_contact_too_long');
  });
});

describe('toContactMessage', () => {
  it('sends the website form body, trimmed', () => {
    expect(toContactMessage({ email: ' ime@gmail.com', subject: ' Pitanje ', message: '\nZdravo!\n' })).toEqual({
      from: 'ime@gmail.com',
      subject: 'Pitanje',
      message: 'Zdravo!',
    });
  });
});
