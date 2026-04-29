import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '../../shared/constants/route.constant';

@Component({
  selector: 'app-business-page',
  imports: [CommonModule, TranslocoModule],
  templateUrl: './business-page.component.html',
  styleUrl: './business-page.component.scss',
})
export class BusinessPageComponent {
  private router = inject(Router);
  routeConstants = RouteConstants;

  navigateToAddSpot() {
    this.router.navigate([`/${RouteConstants.addSpot}`]);
  }
}
