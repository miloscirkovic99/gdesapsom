import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, FormControl, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { take } from 'rxjs';
import { RouteConstants } from '../../../shared/constants/route.constant';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-sign-in',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.scss',
})
export class SignInComponent {
  signinForm!: FormGroup;
  protected authService=inject(AuthService);
  private router=inject(Router)
  constructor() {
    // Initializing the form with controls and validators
    this.signinForm = new FormGroup({
      email: new FormControl('', [Validators.required, Validators.email]),
      password: new FormControl('', [Validators.required]),
    });
  }
  signIn(){
    this.authService.login(this.signinForm.value.email,this.signinForm.value.password).pipe(take(1)).subscribe({
      next:(result)=>{
      localStorage.setItem('sid',result?.sid);
      this.authService.setToken(result.sid);
      this.router.navigate([`${RouteConstants.admin}`])
      }
    })
  }
}
