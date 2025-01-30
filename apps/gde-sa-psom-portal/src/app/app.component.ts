import { Component, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import AOS from 'aos';
import { HttpClient } from '@angular/common/http';
import { SpotsStore } from './shared/store/spots.store';
import { filter, Subscription } from 'rxjs';
import { ContactFormComponent } from './shared/components/contact-form/contact-form.component';
import {
  NgcCookieConsentService,
  NgcInitializingEvent,
  NgcNoCookieLawEvent,
  NgcStatusChangeEvent,
} from 'ngx-cookieconsent';
import { TranslocoService } from '@ngneat/transloco';
@Component({
  imports: [
    RouterModule,
    NavbarComponent,
    FooterComponent,
    ContactFormComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  providers: [SpotsStore],
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  router = inject(Router);
  private translocoService = inject(TranslocoService);
  hideContactForm = signal(false);

  private statusChangeSubscription!: Subscription;

  constructor(private ccService: NgcCookieConsentService) {}

  ngOnInit() {
    AOS.init({
      easing: 'linear', // Customize easing
    });
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((result) => {
        if (result.url.includes('admin')) {
          this.hideContactForm.set(true);
        }
        setTimeout(() => {
          AOS.refresh();
        }, 500); // Add delay to ensure elements are rendered
      });
    this.setupCookie();
  }

  setupCookie() {
    this.statusChangeSubscription = this.ccService.statusChange$.subscribe(
      (event: NgcStatusChangeEvent) => {
        // you can use this.ccService.getConfig() to do stuff...
        if (event.status === 'allow') {
          localStorage.setItem('analyticsAccepted', 'true');
          // this.enableAnalytics();
        } else if (event.status === 'deny') {
          localStorage.setItem('analyticsAccepted', 'false');
        }
      }
    );
  }
  private enableAnalytics(): void {
    (window as any).gtag('config', 'G-BW5JF0HZ5Z');
  }
  ngOnDestroy() {
    this.statusChangeSubscription.unsubscribe();
  }
}
