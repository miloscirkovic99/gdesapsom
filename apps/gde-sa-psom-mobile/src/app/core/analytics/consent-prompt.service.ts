import { inject, Injectable } from '@angular/core';
import { ModalController } from '@ionic/angular/modal-controller';
import { AnalyticsConsentService } from './analytics-consent.service';

/** Asks about usage statistics once, on first launch; More > Settings changes the answer later. */
@Injectable({ providedIn: 'root' })
export class ConsentPromptService {
  private readonly consent = inject(AnalyticsConsentService);
  private readonly modals = inject(ModalController);

  async askIfNeeded(): Promise<void> {
    if (this.consent.consent() !== null) return;

    // Loaded on demand: most launches never show it.
    const { ConsentSheetComponent } = await import('./consent-sheet.component');
    const modal = await this.modals.create({
      component: ConsentSheetComponent,
      cssClass: 'consent-sheet',
      backdropDismiss: false,
      // Only the two answers close it: the back button is not an answer.
      canDismiss: async (_data?: unknown, role?: string) => role === 'granted' || role === 'denied',
      htmlAttributes: { 'aria-labelledby': 'consent-title' },
    });
    await modal.present();

    const { role } = await modal.onWillDismiss();
    if (role === 'granted' || role === 'denied') await this.consent.set(role);
  }
}
