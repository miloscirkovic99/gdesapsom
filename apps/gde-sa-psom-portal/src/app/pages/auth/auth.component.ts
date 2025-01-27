import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './auth.service';
import { take } from 'rxjs';
import { Router } from '@angular/router';
import { RouteConstants } from '../../shared/constants/route.constant';

@Component({
  selector: 'app-auth',
  imports: [CommonModule,ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss',
})
export class AuthComponent {
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
