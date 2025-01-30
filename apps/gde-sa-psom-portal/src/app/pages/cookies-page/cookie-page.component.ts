import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { DomSanitizer } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-cookie-page',
  imports: [CommonModule, TranslocoModule],
  templateUrl: './cookie-page.component.html',
  styleUrl: './cookie-page.component.scss',
})
export class CookiePageComponent {
  sanitizedCookieNecessary: any;
  sanitizedCookieAnalytics: any;
  sanitizedCookieControlDescription: any;
  private langChangeSubscription!: Subscription;

  constructor(
    private sanitizer: DomSanitizer,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.setupSanitizedText();
    this.translocoService.langChanges$.subscribe(() => {
      setTimeout(() => {
        this.setupSanitizedText();
      }, 100);
    });
  }

  setupSanitizedText() {
    // Retrieve the translation and sanitize it
    const sanitizedCookieControlDescription = this.translocoService.translate(
      'cookie_control_description'
    );
    this.sanitizedCookieControlDescription =
      this.sanitizer.bypassSecurityTrustHtml(sanitizedCookieControlDescription);

    const sanitizedCookieAnalytics =
      this.translocoService.translate('cookie_analytics');
    this.sanitizedCookieAnalytics = this.sanitizer.bypassSecurityTrustHtml(
      sanitizedCookieAnalytics
    );

    const sanitizedCookieNecessary =
      this.translocoService.translate('cookie_necessary');
    this.sanitizedCookieNecessary = this.sanitizer.bypassSecurityTrustHtml(
      sanitizedCookieNecessary
    );
  }
  ngOnDestroy(): void {
    // Unsubscribe from the langChange observable to avoid memory leaks
    if (this.langChangeSubscription) {
      this.langChangeSubscription.unsubscribe();
    }
  }
}
