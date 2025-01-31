import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import AOS from 'aos';
import { filter, Subscription } from 'rxjs';
import { ContactFormComponent } from './shared/components/contact-form/contact-form.component';
import {
  NgcCookieConsentService,
  NgcStatusChangeEvent,
} from 'ngx-cookieconsent';

import { environment } from '../env/env.dev';
import { CommonModule } from '@angular/common';
@Component({
  imports: [
    RouterModule,
    NavbarComponent,
    FooterComponent,
    ContactFormComponent,
    CommonModule
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  router = inject(Router);
  isAdminMode = signal(false);
  private statusChangeSubscription!: Subscription;

  constructor(private ccService: NgcCookieConsentService) {}

  ngOnInit() {
    AOS.init({
      easing: 'linear',
    });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((result) => {
        if (result.url.includes('admin')) {
          this.isAdminMode.set(true);
        }
        setTimeout(() => {
          AOS.refresh();
        }, 500); // Ensure elements are rendered before refreshing AOS
      });
    this.setupCookie();
    this.checkAndEnableAnalytics(); // Check and enable Google Analytics
  }

  private checkAndEnableAnalytics(): void {
    if (this.isAnalyticsConsentGranted()) {
      this.enableAnalytics();
    }
  }

  // Check if Google Analytics consent is granted (either from localStorage or cookie service)
  private isAnalyticsConsentGranted(): boolean {
    return (
      localStorage.getItem('analyticsAccepted') === 'true' ||
      this.ccService.hasConsented()
    );
  }

  private enableAnalytics(): void {
    if (!this.isAnalyticsEnabled()) {
      (window as any).gtag('config', environment.googleAnalyticsId);
      console.log('Google Analytics initialized');
    }
  }

  private isAnalyticsEnabled(): boolean {
    return localStorage.getItem('analyticsAccepted') === 'true';
  }

  private setupCookie(): void {
    this.statusChangeSubscription = this.ccService.statusChange$.subscribe(
      (event: NgcStatusChangeEvent) => {
        this.handleCookieConsent(event);
      }
    );
  }

  private handleCookieConsent(event: NgcStatusChangeEvent): void {
    console.log('Cookie consent event:', event);
    if (event.status === 'dismiss') {
      localStorage.setItem('analyticsAccepted', 'true');
      // this.enableAnalytics();
    }
  }
  ngOnDestroy() {
    this.statusChangeSubscription.unsubscribe();
  }
}
