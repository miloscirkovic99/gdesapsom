import { ChangeDetectionStrategy, Component, DestroyRef, effect, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import AOS from 'aos';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactFormComponent } from './shared/components/contact-form/contact-form.component';

import { CommonModule } from '@angular/common';
import { ConsentService } from './core/consent/consent.service';
import { AnalyticsService } from './core/services/analytics.service';
import { GoogleAnalyticsService } from './core/services/google-analytics.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { SeoService } from './core/services/seo.service';
import { VersionUpdateService } from './core/services/version-update.service';
import { PwaInstallDialogComponent } from './shared/dialogs/pwa-install-dialog/pwa-install-dialog.component';
import { BottomNavigationComponent } from './shared/components/bottom-navigation/bottom-navigation.component';
import { CookieBannerComponent } from './shared/components/cookie-banner/cookie-banner.component';
@Component({
  imports: [
    RouterModule,
    NavbarComponent,
    FooterComponent,
    ContactFormComponent,
    CommonModule,
    PwaInstallDialogComponent,
    BottomNavigationComponent,
    CookieBannerComponent,
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  router = inject(Router);
  private readonly googleAnalyticsService=inject(GoogleAnalyticsService)
  private readonly analyticsService = inject(AnalyticsService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly versionUpdateService = inject(VersionUpdateService);
  private readonly seoService = inject(SeoService);
  private readonly activatedRoute = inject(ActivatedRoute);
  private readonly consent = inject(ConsentService);
  isAdminMode = signal(false);
  private destroyRef = inject(DestroyRef);
  showTopButton=false;

  constructor() {
    // Opt-out analytics: gtag.js loads for everyone who has not said no, so
    // the visit is measured from its first page view. "Samo neophodno" (now or
    // later, from the footer) switches it off and deletes its cookies; a
    // visitor who had said no never gets the script at all.
    effect(() => {
      if (this.consent.measurementAllowed()) {
        this.googleAnalyticsService.initialize();
        this.googleAnalyticsService.setEnabled(true);
      } else {
        this.googleAnalyticsService.setEnabled(false);
      }
    });
  }

  ngOnInit() {
    AOS.init({
      easing: 'linear',
    });

    void this.versionUpdateService;

    // Initialize push notifications and start listening for messages
    // this.pushNotificationService.listenForMessages();
    // Optionally request subscription on app init (or show a button to the user)
    // this.pushNotificationService.subscribeToNotifications();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (result.url.includes('admin')) {
          this.isAdminMode.set(true);
        }
        this.updateSeo(result.urlAfterRedirects);
        setTimeout(() => {
          AOS.refresh();
        }, 500);
      });
    this.analyticsService.initOutboundTracking();
  }

  /**
   * Gives every route a self-referencing canonical plus its own title and
   * description. Detail pages (blog post, spot) call SeoService again with the
   * real content once their data arrives, which overwrites these defaults.
   */
  private updateSeo(url: string): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const snapshot = route.snapshot;
    this.seoService.update({
      title: snapshot.title,
      description: snapshot.data?.['description'],
      path: url,
      noindex: snapshot.data?.['noindex'] === true,
    });
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.showTopButton = window.scrollY > 350;
  }
  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
