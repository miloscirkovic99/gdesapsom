import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterModule } from '@angular/router';
import { NavbarComponent } from './shared/components/navbar/navbar.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import AOS from 'aos';
import { filter } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ContactFormComponent } from './shared/components/contact-form/contact-form.component';

import { CommonModule } from '@angular/common';
import { AnalyticsService } from './core/analytics/analytics.service';
import { PushNotificationService } from './core/services/push-notification.service';
import { SeoService } from './core/services/seo.service';
import { VersionUpdateService } from './core/services/version-update.service';
import { PwaInstallDialogComponent } from './shared/dialogs/pwa-install-dialog/pwa-install-dialog.component';
import { BottomNavigationComponent } from './shared/components/bottom-navigation/bottom-navigation.component';
@Component({
  imports: [
    RouterModule,
    NavbarComponent,
    FooterComponent,
    ContactFormComponent,
    CommonModule,
    PwaInstallDialogComponent,
    BottomNavigationComponent
  ],
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  title = 'gde-sa-psom-portal';
  router = inject(Router);
  private readonly analyticsService = inject(AnalyticsService);
  private readonly pushNotificationService = inject(PushNotificationService);
  private readonly versionUpdateService = inject(VersionUpdateService);
  private readonly seoService = inject(SeoService);
  private readonly activatedRoute = inject(ActivatedRoute);
  isAdminMode = signal(false);
  private destroyRef = inject(DestroyRef);
  showTopButton=false;

  ngOnInit() {
    AOS.init({
      easing: 'linear',
    });

    void this.versionUpdateService;

    // Initialize push notifications and start listening for messages
    // this.pushNotificationService.listenForMessages();
    // Optionally request subscription on app init (or show a button to the user)
    // this.pushNotificationService.subscribeToNotifications();

    // Pushes the denied Consent Mode default and starts route tracking. The GA4
    // tag itself is loaded only once the user accepts analytics cookies.
    this.analyticsService.init();

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
