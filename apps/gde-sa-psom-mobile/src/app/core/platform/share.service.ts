import { inject, Injectable } from '@angular/core';
import { Share } from '@capacitor/share';
import { TranslocoService } from '@ngneat/transloco';
import { Notifier } from '@gde/shared/data-access/core';
import { SITE_ORIGIN } from '@gde/shared/util';
import { AnalyticsService, ContentType } from '../analytics/analytics.service';

/** What is being shared, for the `share` event (`content_type`, `item_id`). */
export interface SharedItem {
  type: ContentType;
  id: string;
}

/** Shares the public web page of something shown in the app. */
@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly notifier = inject(Notifier);
  private readonly transloco = inject(TranslocoService);
  private readonly analytics = inject(AnalyticsService);

  /** `path` is the portal path, e.g. `/spots/41`; the link always points at the website. */
  async share(title: string, path: string, item: SharedItem): Promise<void> {
    const url = `${SITE_ORIGIN}${path}`;
    try {
      if ((await Share.canShare()).value) {
        const { activityType } = await Share.share({ title, text: title, url, dialogTitle: title });
        // Android names the app picked in the share sheet (its package); '' when it cannot tell.
        this.analytics.trackShare(activityType || 'share_sheet', item.type, item.id);
        return;
      }
    } catch {
      // Closing the share sheet rejects too; nothing to report.
      return;
    }
    // Desktop browsers without the Web Share API: copy the link instead.
    await navigator.clipboard?.writeText(url);
    this.analytics.trackShare('copy_link', item.type, item.id);
    this.notifier.notify(this.transloco.translate('link_copied'), 'success', this.transloco.translate('close'));
  }
}
