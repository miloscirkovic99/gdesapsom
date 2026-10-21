import { afterNextRender, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { IonApp } from '@ionic/angular/ion-app';
import { IonRouterOutlet } from '@ionic/angular/ion-router-outlet';
import { AnalyticsService } from './core/analytics/analytics.service';
import { ConsentPromptService } from './core/analytics/consent-prompt.service';
import { FormDraftService } from './core/forms/form-draft.service';
import { NativeShellService } from './core/platform/native-shell.service';

@Component({
  selector: 'app-root',
  imports: [IonApp, IonRouterOutlet],
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent {
  constructor() {
    const shell = inject(NativeShellService);
    const consentPrompt = inject(ConsentPromptService);
    const drafts = inject(FormDraftService);
    // Subscribes to the router now, so the first screen is reported too.
    inject(AnalyticsService).start();
    afterNextRender(() => {
      shell.start();
      void consentPrompt.askIfNeeded();
      // Android may have ended the app while a form was half filled (the user went to copy a link).
      void drafts.resume();
    });
  }
}
