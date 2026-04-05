import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslocoModule, TranslocoService } from '@ngneat/transloco';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-cookie-page',
  imports: [CommonModule, TranslocoModule],
  templateUrl: './cookie-page.component.html',
  styleUrl: './cookie-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookiePageComponent {
  sanitizedCookieNecessary: any;
  sanitizedCookieAnalytics: any;
  sanitizedCookieControlDescription: any;
  private destroyRef = inject(DestroyRef);

  constructor(
    private sanitizer: DomSanitizer,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.setupSanitizedText();
    this.translocoService.langChanges$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
  ngOnDestroy(): void {}
}
