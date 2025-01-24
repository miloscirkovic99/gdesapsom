import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactFormService } from './contact-form.service';

@Component({
  selector: 'app-contact-form',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
})
export class ContactFormComponent {
  contactForm: FormGroup;
  private contactFormService=inject(ContactFormService)
  constructor(private fb: FormBuilder) {
    // Create the form group with form controls
    this.contactForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required]
    });
  }
  onSubmit() {
    if (this.contactForm.valid) {
      const data={
        email:this.contactForm.value.email,
        subject:this.contactForm.value.subject,
        message:'From: ' + this.contactForm.value.email + ' message: ' + this.contactForm.value.message
      }
      console.log('Form Submitted', data);
      this.contactFormService.sendEmail(data)
      this.contactForm.reset()
      // Here you can handle the form submission
    } else {
      console.log('Form is not valid');
    }
  }
}
