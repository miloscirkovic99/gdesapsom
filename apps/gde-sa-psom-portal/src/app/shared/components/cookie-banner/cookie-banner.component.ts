import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@ngneat/transloco';
import { RouteConstants } from '@gde/shared/util';
import { ConsentService } from '../../../core/consent/consent.service';

/**
 * Cookie banner with two categories: the site's own storage (always on) and
 * Google Analytics (on until switched off). Shown while the choice is pending
 * and whenever `ConsentService.open()` is called (footer, cookie policy page).
 * Deliberately a bar, not a modal: the site stays usable behind it.
 */
@Component({
  selector: 'app-cookie-banner',
  imports: [RouterLink, TranslocoModule],
  templateUrl: './cookie-banner.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CookieBannerComponent {
  readonly consent = inject(ConsentService);
  readonly routes = RouteConstants;

  readonly showSettings = signal(false);
  /** The analytics toggle in the settings view; mirrors the current choice when opened. */
  readonly analyticsChoice = signal(true);

  openSettings(): void {
    this.analyticsChoice.set(this.consent.status() !== 'denied');
    this.showSettings.set(true);
  }

  toggleAnalytics(event: Event): void {
    this.analyticsChoice.set((event.target as HTMLInputElement).checked);
  }

  acceptAll(): void {
    this.consent.acceptAll();
    this.showSettings.set(false);
  }

  necessaryOnly(): void {
    this.consent.necessaryOnly();
    this.showSettings.set(false);
  }

  saveChoice(): void {
    this.consent.save(this.analyticsChoice());
    this.showSettings.set(false);
  }
}
