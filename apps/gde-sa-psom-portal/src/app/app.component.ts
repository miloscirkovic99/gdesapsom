import { Component, HostListener, inject, signal } from '@angular/core';
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

import { CommonModule } from '@angular/common';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
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
  private readonly googleAnalyticsService=inject(GoogleAnalyticsService)
  isAdminMode = signal(false);
  private statusChangeSubscription!: Subscription;
  showTopButton=false;

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
    this.googleAnalyticsService.initialize();
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.showTopButton = window.scrollY > 350;
  }
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }


  private setupCookie(): void {
    this.statusChangeSubscription = this.ccService.statusChange$.subscribe(
      (event: NgcStatusChangeEvent) => {
        this.handleCookieConsent(event);
      }
    );
  }

  private handleCookieConsent(event: NgcStatusChangeEvent): void {
    if (event.status === 'dismiss') {
      localStorage.setItem('analyticsAccepted', 'true');
      this.enableAnalytics();
    }
  }
  ngOnDestroy() {
    this.statusChangeSubscription.unsubscribe();
  }
}
